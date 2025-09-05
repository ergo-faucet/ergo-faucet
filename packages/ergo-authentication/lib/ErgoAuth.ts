import Redis from 'ioredis';
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
  ErgoAuthConfig,
  RefreshTokenResponse200,
  RefreshTokenResponse401,
} from './types';
import { userRequestPayload } from '@ergo-faucet/common-types';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { UserAddressAction } from '@ergo-faucet/database';
import { hex } from '@fleet-sdk/crypto';
import { ErgoAddress, ErgoMessage, Network } from '@fleet-sdk/core';
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
  private readonly NETWORK_TYPE: Network;
  private readonly ERGO_AUTH_PREFIX = '/auth/ergo';

  /**
   * Private constructor to enforce singleton pattern.
   * @param config - Ergo Auth configuration parameters including redis, fastify, ...
   * @param logger - Optional logger instance.
   */
  private constructor(config: ErgoAuthConfig, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.redis = new Redis(config.redisConfig);
    this.fastifyServer = config.fastifyServer;
    this.userAddressAction = config.userAddressAction;
    this.challengeExpirySeconds = config.challengeExpirySeconds;
    this.refreshTokenExpirySeconds = config.refreshTokenExpirySeconds;
    this.accessTokenExpirySeconds = config.accessTokenExpirySeconds;
    this.NETWORK_TYPE = config.networkType;
  }

  /**
   * Initializes the singleton instance.
   * @param config - Ergo Auth configuration parameters including redis, fastify, ...
   * @param logger - Optional logger instance.
   */
  public static initialize = async (
    config: ErgoAuthConfig,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance) {
      throw new Error('ErgoAuth has already been initialized.');
    }
    this.instance = new ErgoAuth(config, logger);
    await this.instance.registerRoutes(this.instance.ERGO_AUTH_PREFIX);
    this.instance.logger.info(`ErgoAuth initialized successfully.`);
  };

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
  public isValidErgoAddress = (address: string): boolean => {
    try {
      const network = ErgoAddress.fromBase58(address).network;
      return this.NETWORK_TYPE === network;
    } catch (err) {
      if (err instanceof Error) {
        this.logger.debug(`Invalid Ergo address Network: ${address}`, {
          message: err.message,
          stack: err.stack,
        });
      }
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
      if (err instanceof Error) {
        this.logger.debug(`Failed to parse challenge for ${address}`, {
          message: err.message,
          stack: err.stack,
        });
      }
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
      if (err instanceof Error) {
        this.logger.debug(`Failed to verify signature`, {
          message: err.message,
          stack: err.stack,
        });
      }
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
    this.logger.debug(
      `Signature valid: ${isValidSignature} for address: ${address} with challenge: ${challenge} and proof: ${proof} `,
    );

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
   * - `200 OK `{ challenge: string , address: stting }`
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
          const { changedAddress, addresses } = req.body;

          if (!addresses.includes(changedAddress)) {
            return res.status(400).send({
              error: 'changedAddress must be inside addresses list',
              code: 'invalid-changedAddress',
            });
          } else if (!this.isValidErgoAddress(changedAddress)) {
            return res.status(400).send({
              error: 'Invalid Ergo address',
              code: 'invalid-address-network',
            });
          }
        },
      },

      async (request, reply) => {
        const { changedAddress, addresses } = request.body;
        let finallyAddress = changedAddress;
        for (const addr of addresses) {
          const user = await this.userAddressAction.getUserByAddress(addr);
          if (user) {
            finallyAddress = addr;
            break;
          }
        }
        const challenge = await this.createChallenge(finallyAddress);
        return reply.status(200).send({ challenge, address: finallyAddress });
      },
    );
  };

  /**
   * Creates the `/auth` route definition.
   * @param fastify - Fastify instance.
   * @returns Promise<void>
   * - `200 OK `{ success: true, payload: {address: string , userId: number }, accessToken: string }`
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
            if (!this.isValidErgoAddress(address)) {
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

        const payload: userRequestPayload = {
          userId: user.id,
          address: address,
          name: user.name,
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
   * @param fastify - Fastify instance.
   * @returns Promise<void>
   * - `200 OK `{ success: true, newToken: string }`
   */
  private refreshTokenRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.get(
      '/refresh-token',
      {
        schema: {
          response: {
            200: RefreshTokenResponse200,
            401: RefreshTokenResponse401,
          },
        },
      },
      async (request, reply) => {
        try {
          const decoded = await request.jwtVerify<userRequestPayload>({
            onlyCookie: true,
          });

          const newToken = await reply.jwtSign(decoded, {
            expiresIn: this.accessTokenExpirySeconds,
          });

          return reply.send({ success: true, newToken });
        } catch (err) {
          if (err instanceof Error) {
            this.logger.debug(`Token refresh failed:`, {
              message: err.message,
              stack: err.stack,
            });
          }
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
