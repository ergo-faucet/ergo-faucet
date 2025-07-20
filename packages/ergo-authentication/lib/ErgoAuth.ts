import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AuthenticationBody,
  AuthenticationResponse200,
  AuthenticationResponseError,
  ChallengeBody,
  ChallengeErrorResponse,
  ChallengeRecord,
  ChallengeResponse200,
  ChallengeVerificationResult,
  payloadJWT,
  RefreshTokenBody,
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
import { Static } from '@sinclair/typebox';

type AuthenticationBodyType = Static<typeof AuthenticationBody>;
type RefreshTokenBodyType = Static<typeof RefreshTokenBody>;
type ChallengeBodyType = Static<typeof ChallengeBody>;
type RedisConfig = RedisOptions;
const ERGO_AUTH_PREFIX = '/ergo-auth';

export class ErgoAuth {
  private static instance: ErgoAuth;
  private redis!: Redis;
  private logger: AbstractLogger;
  private fastifyServer: FastifyAPIServer;
  private userAddressAction: UserAddressAction;
  private redisExpirySeconds: number;
  private refreshTokenExpirySeconds: number;
  private accessTokenExpirySeconds: number;

  /**
   * Private constructor to enforce singleton pattern.
   * @param redisConfig - Redis connection string or options.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param userAddressAction - User address action instance for database interactions.
   * @param redisExpirySeconds - Optional expiry time for challenges in seconds (default: 300s)
   * @param refreshTokenExpirySeconds - Optional expiry time for refresh token in seconds (default: 86400s)
   * @param accessTokenExpirySeconds - Optional expiry time for access token in seconds (default: 3600s)
   * @param logger - Optional logger instance.
   */
  private constructor(
    redisConfig: RedisConfig,
    fastifyServer: FastifyAPIServer,
    userAddressAction: UserAddressAction,
    logger?: AbstractLogger,
    redisExpirySeconds = 300,
    refreshTokenExpirySeconds = 86400,
    accessTokenExpirySeconds = 3600,
  ) {
    this.logger = logger ?? new DummyLogger();
    this.redis = new Redis(redisConfig);
    this.fastifyServer = fastifyServer;
    this.userAddressAction = userAddressAction;
    this.redisExpirySeconds = redisExpirySeconds;
    this.refreshTokenExpirySeconds = refreshTokenExpirySeconds;
    this.accessTokenExpirySeconds = accessTokenExpirySeconds;
    this.logger.info('[ErgoAuth] Redis connection initialized.');
  }

  /**
   * Initializes the singleton instance.
   * @param redisConfig - Redis connection string or options.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param userAddressAction - User address action instance for database interactions.
   * @param logger - Optional logger instance.
   * @param redisExpirySeconds - Optional expiry time for challenges in seconds (default: 300s)
   * @param refreshTokenExpirySeconds - Optional expiry time for refresh token in seconds (default: 86400s)
   * @param accessTokenExpirySeconds - Optional expiry time for access token in seconds (default: 3600s)
   * @throws Error if already initialized.
   */
  public static async initialize(
    redisConfig: RedisConfig,
    fastifyServer: FastifyAPIServer,
    userAddressAction: UserAddressAction,
    logger?: AbstractLogger,
    redisExpirySeconds?: number,
    refreshTokenExpirySeconds?: number,
    accessTokenExpirySeconds?: number,
  ): Promise<void> {
    if (this.instance) {
      throw new Error('ErgoAuth has already been initialized.');
    }
    this.instance = new ErgoAuth(
      redisConfig,
      fastifyServer,
      userAddressAction,
      logger,
      redisExpirySeconds,
      refreshTokenExpirySeconds,
      accessTokenExpirySeconds,
    );
    await this.instance.registerRoutes(ERGO_AUTH_PREFIX);
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
   * Retrieves a saved challenge record for a given address from Redis.
   *
   * @param address - The user's address
   * @returns `ChallengeRecord | null` if found, otherwise `null`
   */
  private async getChallengeRecord(
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
  private verifySignature = (
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
  private createChallenge = async (address: string): Promise<string> => {
    const challenge = uuidv4();
    const createdAt = Math.floor(Date.now() / 1000);
    const value: ChallengeRecord = { address, challenge, createdAt };

    await this.redis.set(
      `challenge:${address}`,
      JSON.stringify(value),
      'EX',
      this.redisExpirySeconds,
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
  private async verifyChallenge(
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
      },
      async (request, reply) => {
        const { address } = request.body;

        if (!address || address.trim() === '') {
          return reply.status(400).send({
            error: 'Invalid address',
            code: 'invalid-address',
          });
        }

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
   * - Verifies the provided challenge and proof.
   * - Creates or retrieves the user from the database.
   * - Issues a `refreshToken` (stored in `auth_token` cookie) and an `accessToken`.
   *
   * **Responses:**
   * - `200 OK` → `{ success: true, userId: number, accessToken: string }`
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
        preHandler: this.fastifyServer.captchaPreHandler,
      },

      async (request, reply) => {
        const { address, challenge, proof } = request.body;

        const isValid = await this.verifyChallenge(address, challenge, proof);

        if (!isValid) {
          return reply.status(401).send({
            error: 'Invalid challenge',
            code: 'challenge-verification-failed',
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
          userId: user.id,
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
          const decoded = (await request.jwtVerify({
            onlyCookie: true,
          })) as payloadJWT;

          const payload: payloadJWT = {
            userId: decoded.userId,
            address: decoded.address,
          };

          const newToken = await reply.jwtSign(payload, {
            expiresIn: this.accessTokenExpirySeconds,
          });

          return reply.send({ success: true, newToken });
        } catch (err) {
          this.logger.debug(`[RefreshToken] Token refresh failed: ${err}`);
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
  private registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(this.challengeRoute, prefix);
    await this.fastifyServer.register(this.authenticationRoute, prefix);
    await this.fastifyServer.register(this.refreshTokenRoute, prefix);
    this.logger.info(`[ErgoAuth] Routes registered under prefix "${prefix}"`);
  };
}
