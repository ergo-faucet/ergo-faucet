import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ChallengeRecord, VerifySignatureParams } from './types';
import { verifySignature } from './utils';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

type RedisConfig = RedisOptions;
const ERGO_AUTH_PREFIX = '/ergo-auth';

export class ErgoAuth {
  private static instance: ErgoAuth;
  private redis!: Redis;
  private logger: AbstractLogger;
  private fastifyServer: FastifyAPIServer;
  private redisExpirySeconds: number;

  /**
   * Private constructor to enforce singleton pattern.
   * @param redisConfig - Redis connection string or options.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param redisExpirySeconds - Optional expiry time for challenges in seconds (default:
   * @param logger - Optional logger instance.
   */
  private constructor(
    redisConfig: RedisConfig,
    fastifyServer: FastifyAPIServer,
    logger?: AbstractLogger,
    redisExpirySeconds = 300,
  ) {
    this.logger = logger ?? new DummyLogger();
    this.redis = new Redis(redisConfig);
    this.fastifyServer = fastifyServer;
    this.redisExpirySeconds = redisExpirySeconds;
    this.logger.info('[ErgoAuth] Redis connection initialized.');
    this.registerRoutes(ERGO_AUTH_PREFIX);
  }

  /**
   * Initializes the singleton instance.
   * @param redisConfig - Redis connection string or options.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param logger - Optional logger instance.
   * @param redisExpirySeconds - Optional expiry time for challenges in seconds (default:
   * @throws Error if already initialized.
   */
  public static initialize = (
    redisConfig: RedisConfig,
    fastifyServer: FastifyAPIServer,
    logger?: AbstractLogger,
    redisExpirySeconds?: number,
  ): void => {
    if (this.instance) {
      throw new Error('ErgoAuth has already been initialized.');
    }
    this.instance = new ErgoAuth(
      redisConfig,
      fastifyServer,
      logger,
      redisExpirySeconds,
    );
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
      this.redisExpirySeconds,
    );
    this.logger.debug(`[ErgoAuth] Created challenge for ${address}`);

    return challenge;
  };

  /**
   * Verifies the challenge proof against the stored challenge and address.
   * @param params - Object containing address, challenge, and proof (signature)
   * @returns true if valid, false otherwise
   * @throws Error if challenge expired/not found or mismatch
   */
  public verifyChallenge = async ({
    address,
    signedMessage: challenge,
    proof,
  }: VerifySignatureParams): Promise<boolean> => {
    const raw = await this.redis.get(`challenge:${address}`);
    if (!raw) {
      this.logger.warn(`[ErgoAuth] No challenge found for ${address}`);
      throw new Error('Challenge expired or not found');
    }

    const saved: ChallengeRecord = JSON.parse(raw);

    if (saved.challenge !== challenge) {
      this.logger.warn(`[ErgoAuth] Challenge mismatch for ${address}`);
      throw new Error('Challenge mismatch');
    }

    const verifyParam: VerifySignatureParams = {
      address,
      signedMessage: challenge,
      proof,
    };
    const isValid = verifySignature({ ...verifyParam, logger: this.logger });
    this.logger.info(`[ErgoAuth] Signature valid: ${isValid} for ${address}`);

    return isValid ?? false;
  };

  /**
   * Registers the API routes for ErgoAuth.
   * @param prefix - URL prefix for the routes
   */
  private registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(async (fastify) => {
      fastify.post('/challenge', async (request) => {
        const { address } = request.body as { address: string };
        const challenge = await this.createChallenge(address);
        return { challenge };
      });
    }, prefix);

    await this.fastifyServer.register(async (fastify) => {
      fastify.post('/verify', async (request) => {
        const { address, signedMessage, proof } = request.body as {
          address: string;
          signedMessage: string;
          proof: string;
        };
        const isValid = await this.verifyChallenge({
          address,
          signedMessage,
          proof,
        });
        return { isValid };
      });
    }, prefix);
    this.logger.info(`[ErgoAuth] Routes registered under prefix "${prefix}"`);
  };

  /**
   * Close Redis connection.
   */
  public close = async (): Promise<void> => {
    await this.redis.quit();
    this.logger.info('[ErgoAuth] Redis connection closed');
  };
}
