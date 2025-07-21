import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AuthenticationBody,
  AuthenticationBodyType,
  AuthenticationResponse200,
  AuthenticationResponseError,
  ChallengeBody,
  ChallengeBodyType,
  ChallengeErrorResponse,
  ChallengeRecord,
  ChallengeResponse200,
  ChallengeVerificationResult,
  payloadJWT,
  RefreshTokenBody,
  RefreshTokenBodyType,
  RefreshTokenResponse200,
  RefreshTokenResponse401,
} from './types';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { UserAddressAction } from '@ergo-faucet/database';
import { hex } from '@fleet-sdk/crypto';
import { ErgoAddress, ErgoMessage } from '@fleet-sdk/core';
import { Prover } from '@fleet-sdk/wallet';

export class ErgoAuth {
  private static instance: ErgoAuth;
  private readonly redis: Redis;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly userAddressAction: UserAddressAction;

  private readonly challengeExpirySeconds: number;
  private readonly refreshTokenExpirySeconds: number;
  private readonly accessTokenExpirySeconds: number;
  private readonly NETWORK_ADDRESS: 'MAINNET' | 'TESTNET' = 'MAINNET';
  private readonly ERGO_AUTH_PREFIX = '/ergo-auth';

  /**
   * Private constructor to enforce singleton pattern.
   * @param redisConfig - Redis connection string or options.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param userAddressAction - User address action instance for database interactions.
   * @param challengeExpirySeconds -  expiry time for challenges in seconds
   * @param refreshTokenExpirySeconds -  expiry time for refresh token in seconds
   * @param accessTokenExpirySeconds -  expiry time for access token in seconds
   * @param networkAddress - The network address (MAINNET or TESTNET).
   * @param logger - Optional logger instance.
   */
  private constructor(
    redisConfig: RedisOptions,
    fastifyServer: FastifyAPIServer,
    userAddressAction: UserAddressAction,
    challengeExpirySeconds: number,
    refreshTokenExpirySeconds: number,
    accessTokenExpirySeconds: number,
    networkAddress: 'MAINNET' | 'TESTNET' = 'MAINNET',
    logger?: AbstractLogger,
  ) {
    this.logger = logger ?? new DummyLogger();
    this.redis = new Redis(redisConfig);
    this.fastifyServer = fastifyServer;
    this.userAddressAction = userAddressAction;
    this.challengeExpirySeconds = challengeExpirySeconds;
    this.refreshTokenExpirySeconds = refreshTokenExpirySeconds;
    this.accessTokenExpirySeconds = accessTokenExpirySeconds;
    this.NETWORK_ADDRESS = networkAddress;
  }

  /**
   * Initializes the singleton instance.
   * @param redisConfig - Redis connection string or options.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param userAddressAction - User address action instance for database interactions.
   * @param challengeExpirySeconds -  expiry time for challenges in seconds
   * @param refreshTokenExpirySeconds -  expiry time for refresh token in seconds
   * @param accessTokenExpirySeconds -  expiry time for access token in seconds
   * @param networkAddress - The network address (MAINNET or TESTNET).
   * @param logger - Optional logger instance.
   * @throws Error if already initialized.
   */
  public static async initialize(
    redisConfig: RedisOptions,
    fastifyServer: FastifyAPIServer,
    userAddressAction: UserAddressAction,
    challengeExpirySeconds: number,
    refreshTokenExpirySeconds: number,
    accessTokenExpirySeconds: number,
    networkAddress: 'MAINNET' | 'TESTNET',
    logger?: AbstractLogger,
  ): Promise<void> {
    if (this.instance) {
      throw new Error('ErgoAuth has already been initialized.');
    }
    this.instance = new ErgoAuth(
      redisConfig,
      fastifyServer,
      userAddressAction,
      challengeExpirySeconds,
      refreshTokenExpirySeconds,
      accessTokenExpirySeconds,
      networkAddress,
      logger,
    );
    await this.instance.registerRoutes(this.instance.ERGO_AUTH_PREFIX);
  }

  /**
   * Returns the singleton instance after initialization.
   * @returns ErgoAuth instance
   * @throws Error if instance not initialized.
   */
  public static getInstance = (): ErgoAuth => {
    if (!this.instance) {
      throw new Error('ErgoAuth instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Validates if the provided Ergo address is valid for the configured network.
   * @param address - The Ergo address to validate.
   * @returns `true` if valid, otherwise `false`.
   */
  public isvalidErgoAddress = (address: string): boolean => {
    try {
      const network = ErgoAddress.fromBase58(address).network;
      return this.NETWORK_ADDRESS === 'MAINNET'
        ? network === 0
        : network === 16;
    } catch (err) {
      this.logger.debug(
        `Invalid Ergo address Network: ${address} with error: ${err}`,
      );
      return false;
    }
  };

  /**
   * Retrieves a saved challenge record for a given address from Redis.
   *
   * @param address - The user's address
   * @returns `ChallengeRecord | null` if found, otherwise `null`
   */
  public async getChallengeRecord(
    address: string,
  ): Promise<ChallengeRecord | null> {
    const raw = await this.redis.get(`challenge:${address}`);

    if (!raw) {
      this.logger.debug(`No challenge found for ${address}`);
      return null;
    }

    try {
      const record: ChallengeRecord = JSON.parse(raw);
      return record;
    } catch (err) {
      this.logger.debug(`Failed to parse challenge for ${address}: ${err}`);
      return null;
    }
  }

  /**
   * Verifies a signed Ergo message using a public key derived from an Ergo address.
   *
   * @param address - The Ergo address to verify against.
   * @param signedMessage - The signed message in base58 format.
   * @param proof - The signature proof in hex format.
   * @returns `true` if signature is valid, otherwise `false`
   */
  public verifySignature = (
    address: string,
    signedMessage: string,
    proof: string,
  ): boolean => {
    try {
      const message = ErgoMessage.fromData(signedMessage);
      const [publicKey] = ErgoAddress.fromBase58(address).getPublicKeys();
      const proofBytes = hex.decode(proof);
      const prover = new Prover();
      return prover.verify(message, proofBytes, publicKey);
    } catch (err) {
      this.logger.debug(`Failed to verify signature: ${err}`);
      return false;
    }
  };

  /**
   * Creates a new UUID challenge for a given address and stores it in Redis with expiry.
   * @param address - Ergo blockchain address
   * @returns challenge string (UUID)
   */
  public createChallenge = async (address: string): Promise<string> => {
    const challenge = uuidv4();
    const createdAt = Math.floor(Date.now() / 1000);
    const value: ChallengeRecord = { address, challenge, createdAt };

    await this.redis.set(
      `challenge:${address}`,
      JSON.stringify(value),
      'EX',
      this.challengeExpirySeconds,
    );
    this.logger.debug(`Created challenge for ${address}`);

    return challenge;
  };

  /**
   * Verifies the challenge proof against the stored challenge and address.
   * @param address - The user's wallet address used as the Redis key.
   * @param challenge - The challenge string provided by the client.
   * @param proof - The cryptographic proof/signature for the challenge.
   * @returns {Promise<ChallengeVerificationResult>}
   *  `{ success: true }` if the challenge is valid and the proof matches.
   *  `{ success: false, code, message }` with an error code if validation fails.
   */
  public async verifyChallenge(
    address: string,
    challenge: string,
    proof: string,
  ): Promise<ChallengeVerificationResult> {
    const saved = await this.getChallengeRecord(address);
    if (!saved) {
      return {
        success: false,
        code: 'challenge-not-found',
        message: 'Challenge expired, not found, or invalid data',
      };
    }

    if (saved.challenge !== challenge) {
      this.logger.debug(`Challenge mismatch for ${address}`);
      return {
        success: false,
        code: 'challenge-mismatch',
        message: 'Challenge mismatch',
      };
    }

    const isValidSignature = this.verifySignature(address, challenge, proof);
    this.logger.debug(`Signature valid: ${isValidSignature} for ${address}`);

    if (!isValidSignature) {
      return {
        success: false,
        code: 'invalid-signature',
        message: 'Invalid signature proof',
      };
    }

    return { success: true };
  }

  /**
   * Creates the `/challenge` route definition.
   *
   * @param fastify - Fastify instance.
   * @returns Promise<void>
   *
   * **Description:**
   * This route allows users to initiate a challenge for authentication.
   *
   * **Request Body:**
   * - `address` (string) → The user wallet address.
   *
   * **Behavior:**
   * - Validates the provided address against the configured network.
   * - Validates that the address is provided and not empty.
   * - Generates a challenge string.
   * - Stores the challenge in Redis with an expiry time.
   *
   * **Responses:**
   * - `200 OK` → `{ challenge: string }`
   * - `400 Bad Request` → `{ error: 'Invalid address', code: 'invalid-address' }`
   *
   * **Throws:**
   * - `400` if the address is missing or invalid.
   */
  private challengeRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: ChallengeBodyType }>(
      '/challenge',
      {
        schema: {
          body: ChallengeBody,
          response: {
            200: ChallengeResponse200,
            400: ChallengeErrorResponse,
          },
        },
        preHandler: async (req, res) => {
          const { address } = req.body;
          if (!this.isvalidErgoAddress(address)) {
            return res.status(400).send({
              error: 'Invalid Ergo address',
              code: 'invalid-address-network',
            });
          }
        },
      },

      async (request, reply) => {
        const { address } = request.body;
        const challenge = await this.createChallenge(address);
        return reply.send({ challenge });
      },
    );
  };

  /**
   * Creates the `/auth` route definition.
   *
   * @param fastify - Fastify instance.
   * @returns Promise<void>
   *
   * **Description:**
   * This route allows users to verify their challenge response and complete authentication.
   *
   * **Request Body:**
   * - `address` (string) → Wallet address of the user.
   * - `challenge` (string) → The original challenge string signed by the user.
   * - `proof` (string) → The signature proof of the challenge.
   * - `captchaToken` (string) → reCAPTCHA token for bot protection.
   *
   * **Behavior:**
   * - Runs the `captchaPreHandler` to verify the captcha token.
   * - Validates the provided address against the configured network.
   * - Verifies the provided challenge and proof.
   * - Creates or retrieves the user from the database.
   * - Issues a `refreshToken` (stored in `auth_token` cookie) and an `accessToken`.
   *
   * **Responses:**
   * - `200 OK` → `{ success: true, payload: {address , userId }, accessToken: string }`
   * - `400 Bad Request` → `{ error: string, code: string }` (captcha or malformed input)
   * - `401 Unauthorized` → `{ error: 'Invalid challenge', code: 'challenge-verification-failed' }`
   *
   * **Throws:**
   * - `401` if the challenge verification fails.
   * - `401` if the captcha verification fails.
   */
  private authenticationRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: AuthenticationBodyType }>(
      '/auth',
      {
        schema: {
          body: AuthenticationBody,
          response: {
            200: AuthenticationResponse200,
            400: AuthenticationResponseError,
            401: AuthenticationResponseError,
          },
        },
        preHandler: [
          this.fastifyServer.captchaPreHandler,
          async (req, res) => {
            const { address } = req.body;
            if (!this.isvalidErgoAddress(address)) {
              return res.status(400).send({
                error: 'Invalid Ergo address',
                code: 'invalid-address-network',
              });
            }
          },
        ],
      },

      async (request, reply) => {
        const { address, challenge, proof } = request.body;

        const isValid = await this.verifyChallenge(address, challenge, proof);

        if (!isValid.success) {
          return reply.status(401).send({
            error: isValid.message,
            code: isValid.code,
          });
        }

        const user =
          await this.userAddressAction.findOrCreateUserWithAddress(address);

        const payload: payloadJWT = {
          userId: user.id,
          address,
        };

        const refreshToken = await reply.jwtSign(payload, {
          expiresIn: this.refreshTokenExpirySeconds,
        });
        const accessToken = await reply.jwtSign(payload, {
          expiresIn: this.accessTokenExpirySeconds,
        });

        this.fastifyServer.setAuthCookie(reply, refreshToken);

        return reply.send({
          success: true,
          payload: payload,
          accessToken,
        });
      },
    );
  };

  /**
   * Creates the `/refresh-token` route definition.
   *
   * @param fastify - Fastify instance.
   * @returns Promise<void>
   *
   * **Description:**
   * This route allows users to refresh their JWT `accessToken`
   * using the `auth_token` cookie (refresh token).
   *
   * **Request Body:**
   * - (none) – Uses `auth_token` cookie for authentication.
   *
   * **Behavior:**
   * - Verifies the `auth_token` cookie using `jwtVerify`.
   * - If valid, issues a new `accessToken` with a fresh expiry time.
   *
   * **Responses:**
   * - `200 OK` → `{ success: true, newToken: string }`
   * - `401 Unauthorized` → `{ error: 'Invalid or expired token' }`
   *
   * **Throws:**
   * - `401` if no cookie is present, or if the token is invalid/expired.
   */
  private refreshTokenRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: RefreshTokenBodyType }>(
      '/refresh-token',
      {
        schema: {
          body: RefreshTokenBody,
          response: {
            200: RefreshTokenResponse200,
            401: RefreshTokenResponse401,
          },
        },
      },
      async (request, reply) => {
        try {
          const decoded = await request.jwtVerify<payloadJWT>({
            onlyCookie: true,
          });

          const newToken = await reply.jwtSign(decoded, {
            expiresIn: this.accessTokenExpirySeconds,
          });

          return reply.send({ success: true, newToken });
        } catch (err) {
          this.logger.debug(`Token refresh failed: ${err}`);
          return reply.status(401).send({ error: 'Invalid or expired token' });
        }
      },
    );
  };

  /**
   * Registers the API routes for ErgoAuth.
   * @param prefix - URL prefix for the routes
   * @returns Promise<void>
   * This method registers the challenge, verify, and refresh-token routes
   * under the specified prefix.
   */
  public registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(this.challengeRoute, prefix);
    await this.fastifyServer.register(this.authenticationRoute, prefix);
    await this.fastifyServer.register(this.refreshTokenRoute, prefix);
    this.logger.info(`Routes registered under prefix "${prefix}"`);
  };
}
