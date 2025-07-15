import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ChallengeRecord, VerifyParams, VerifySignatureParams } from './types';
import { verifySignature } from './utils';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { GoogleRecaptcha } from '@ergo-faucet/google-recaptcha';

type RedisConfig = RedisOptions;
const ERGO_AUTH_PREFIX = '/ergo-auth';

export class ErgoAuth {
  private static instance: ErgoAuth;
  private redis!: Redis;
  private logger: AbstractLogger;
  private fastifyServer: FastifyAPIServer;
  private googleRecaptcha: GoogleRecaptcha;
  private redisExpirySeconds: number;

  /**
   * Private constructor to enforce singleton pattern.
   * @param redisConfig - Redis connection string or options.
   * @param googleRecaptcha - Google Recaptcha instance for challenge verification.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param redisExpirySeconds - Optional expiry time for challenges in seconds (default:
   * @param logger - Optional logger instance.
   */
  private constructor(
    redisConfig: RedisConfig,
    fastifyServer: FastifyAPIServer,
    googleRecaptcha: GoogleRecaptcha,
    logger?: AbstractLogger,
    redisExpirySeconds = 300,
  ) {
    this.logger = logger ?? new DummyLogger();
    this.redis = new Redis(redisConfig);
    this.fastifyServer = fastifyServer;
    this.googleRecaptcha = googleRecaptcha;
    this.redisExpirySeconds = redisExpirySeconds;
    this.logger.info('[ErgoAuth] Redis connection initialized.');
  }

  /**
   * Initializes the singleton instance.
   * @param redisConfig - Redis connection string or options.
   * @param fastifyServer - Fastify server instance for API integration.
   * @param logger - Optional logger instance.
   * @param redisExpirySeconds - Optional expiry time for challenges in seconds (default:
   * @throws Error if already initialized.
   */
  public static async initialize(
    redisConfig: RedisConfig,
    fastifyServer: FastifyAPIServer,
    googleRecaptcha: GoogleRecaptcha,
    logger?: AbstractLogger,
    redisExpirySeconds?: number,
  ): Promise<void> {
    if (this.instance) {
      throw new Error('ErgoAuth has already been initialized.');
    }
    this.instance = new ErgoAuth(
      redisConfig,
      fastifyServer,
      googleRecaptcha,
      logger,
      redisExpirySeconds,
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
   * @param verifySignatureParams - Parameters containing address, signedMessage, proof
   * @param captchaToken - Google Recaptcha token for additional security
   * @throws Error if challenge expired/not found or mismatch
   * @throws Error if captcha verification fails
   * @throws Error if signature verification fails
   * @returns true if valid, false otherwise
   */
  public verifyChallenge = async ({
    verifySignatureParams,
    captchaToken,
  }: VerifyParams): Promise<boolean> => {
    const { address, signedMessage: challenge, proof } = verifySignatureParams;

    // Verify Google Recaptcha first
    const isCaptchaValid = await this.googleRecaptcha.verifyToken(captchaToken);
    if (!isCaptchaValid) {
      this.logger.debug(`[ErgoAuth] Invalid captcha token for ${address}`);
      throw new Error('Invalid captcha token');
    }

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
    this.logger.debug(`[ErgoAuth] Signature valid: ${isValid} for ${address}`);

    return isValid;
  };

  /**
   * Registers the API routes for ErgoAuth.
   * @param prefix - URL prefix for the routes
   */
  private registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(async (fastify: FastifyInstance) => {
      fastify.post('/challenge', async (request: FastifyRequest) => {
        const { address } = request.body as { address: string };
        const challenge = await this.createChallenge(address);
        return { challenge };
      });
    }, prefix);

    await this.fastifyServer.register(async (fastify: FastifyInstance) => {
      fastify.post('/verify', async (request: FastifyRequest) => {
        const { address, signedMessage, proof, captchaToken } =
          request.body as {
            address: string;
            signedMessage: string;
            proof: string;
            captchaToken: string;
          };
        const isValid = await this.verifyChallenge({
          verifySignatureParams: {
            address,
            signedMessage,
            proof,
          },
          captchaToken,
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
