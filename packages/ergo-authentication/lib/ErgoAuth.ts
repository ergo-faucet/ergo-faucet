import Redis, { RedisOptions } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  ChallengeRecord,
  VerifyParams,
  VerifySignatureParams,
  payloadJWT,
} from './types';
import { verifySignature } from './utils';
import {
  FastifyAPIServer,
  FastifySeverInstance,
  FastifyRequest,
  FastifyReply,
} from '@ergo-faucet/fastify-server';
import { GoogleRecaptcha } from '@ergo-faucet/google-recaptcha';
import { UserAddressAction } from '@ergo-faucet/database';

type RedisConfig = RedisOptions;
const ERGO_AUTH_PREFIX = '/ergo-auth';

export class ErgoAuth {
  private static instance: ErgoAuth;
  private redis!: Redis;
  private logger: AbstractLogger;
  private fastifyServer: FastifyAPIServer;
  private googleRecaptcha: GoogleRecaptcha;
  private userAddressAction: UserAddressAction;
  private redisExpirySeconds: number;
  private refreshTokenExpirySeconds: number;
  private accessTokenExpirySeconds: number;

  /**
   * Private constructor to enforce singleton pattern.
   * @param redisConfig - Redis connection string or options.
   * @param googleRecaptcha - Google Recaptcha instance for challenge verification.
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
    googleRecaptcha: GoogleRecaptcha,
    userAddressAction: UserAddressAction,
    logger?: AbstractLogger,
    redisExpirySeconds = 300,
    refreshTokenExpirySeconds = 86400,
    accessTokenExpirySeconds = 3600,
  ) {
    this.logger = logger ?? new DummyLogger();
    this.redis = new Redis(redisConfig);
    this.fastifyServer = fastifyServer;
    this.googleRecaptcha = googleRecaptcha;
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
   * @param googleRecaptcha - Google Recaptcha instance for challenge verification.
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
    googleRecaptcha: GoogleRecaptcha,
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
      googleRecaptcha,
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
   * Creates the /challenge route definition.
   * @param fastify - Fastify instance
   * @return Promise<void>
   * This route allows users to initiate a challenge.
   * It expects the address in the request body.
   * It generates a challenge and stores it in Redis with an expiry time.
   * @throws 400 if the address is not provided.
   * @returns { challenge: string } if successful.
   */
  private createChallengeRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post('/challenge', async (request: FastifyRequest) => {
      const { address } = request.body as { address: string };
      const challenge = await this.createChallenge(address);
      return { challenge };
    });
  };

  /**
   * Creates the /verify route definition.
   * @param fastify - Fastify instance
   * This route allows users to verify their challenge response.
   * It expects the address, signedMessage (challenge), proof, and captchaToken in the
   * request body.
   * It verifies the challenge, checks the captcha token, and if valid,
   * it creates or retrieves the user based on the address.
   * If successful, it issues a JWT token and sets it in the auth_token cookie.
   * @throws 401 if the challenge is invalid, captcha verification fails, or signature verification fails.
   * @returns { success: true, userId: number, accessToken : accessToken } if successful.
   */
  private createVerifyRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post(
      '/verify',
      async (request: FastifyRequest, reply: FastifyReply) => {
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

        if (!isValid) {
          return reply.status(401).send({ error: 'Invalid challenge' });
        }

        const user =
          await this.userAddressAction.findOrCreateUserWithAddress(address);

        const payload: payloadJWT = {
          userId: user.id,
          address: address,
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
          accessToken: accessToken,
        });
      },
    );
  };

  /**
   * Creates the /refresh-token route definition.
   * @param fastify - Fastify instance
   * @return Promise<void>
   * This route allows users to refresh their JWT token using the existing auth_token cookie.
   * It checks for the presence of the auth_token cookie, verifies it, and issues a new
   * token if valid.
   * @throws 401 if no token is provided or if the token is invalid/expired.
   * */
  private createRefreshTokenRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post(
      '/refresh-token',
      async (request: FastifyRequest, reply: FastifyReply) => {
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

          return reply.send({ success: true, newToken: newToken });
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
    await this.fastifyServer.register(this.createChallengeRoute, prefix);
    await this.fastifyServer.register(this.createVerifyRoute, prefix);
    await this.fastifyServer.register(this.createRefreshTokenRoute, prefix);
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
