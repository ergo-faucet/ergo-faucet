import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import Redis from 'ioredis';
import crypto from 'crypto';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { AuthConfig } from './types';

export abstract class AbstractOAuth {
  protected readonly fastifyServer: FastifyAPIServer;
  protected readonly clientID: string;
  protected readonly clientSecret: string;
  protected readonly redirectURL: string;
  protected readonly scope: string;
  protected readonly expiresTime: number;
  protected readonly sessionTTL: number;
  protected readonly frontBaseURL: string;
  protected readonly sessionPrefix: string;
  protected readonly redis: Redis;
  protected readonly action: AuthConfig['action'];
  protected logger: AbstractLogger;

  constructor(
    config: AuthConfig,
    sessionPrefix: string,
    logger?: AbstractLogger,
  ) {
    this.clientID = config.clientID;
    this.clientSecret = config.clientSecret;
    this.redirectURL = config.redirectURL;
    this.scope = config.scope;
    this.expiresTime = config.expiresTime;
    this.sessionTTL = config.sessionTTL;
    this.logger = logger ?? new DummyLogger();
    this.frontBaseURL = config.frontBaseURL;
    this.sessionPrefix = sessionPrefix;
    this.redis = new Redis(config.redis);
    this.fastifyServer = config.fastifyServer;
    this.action = config.action;
  }

  /**
   * Builds the front-end redirect URL with query parameters for OAuth2 login result.
   *
   * @param authMethod - The authentication method used (e.g., 'google', 'discord')
   * @param frontState - State value provided by the front-end to maintain session/context
   * @param status - Result status of the OAuth flow ('success' or 'failed')
   * @param message - Optional message to include in the URL (e.g., success or error message)
   * @returns Fully qualified URL string combining the frontBaseURL, frontState, and query parameters
   */
  protected buildRedirectURL = (
    authMethod: string,
    frontState: string,
    status: 'success' | 'failed',
    message?: string,
  ): string => {
    const [path, query] = frontState.split('?');
    const params = new URLSearchParams(query);
    params.set('authMethod', authMethod);
    params.set('authMethodStatus', status);
    if (message) {
      params.set('message', message);
    }
    return `${this.frontBaseURL + path}?${params.toString()}`;
  };

  /**
   * Sets session data in Redis with TTL.
   * @param key - Session key
   * @param value - string data
   * @param ttl - Time to live in seconds
   */
  protected setSessionData = async (
    key: string,
    value: string,
    ttl: number,
  ): Promise<void> => {
    const fullKey = `${this.sessionPrefix}${key}`;
    this.logger.debug(`Try to set session data for key: ${key}`);
    await this.redis.set(fullKey, value);
    if (ttl) {
      await this.redis.expire(fullKey, ttl);
    }
  };

  /**
   * Gets session data from Redis.
   * @param key - Session key
   * @returns Session data or null if not found
   */
  protected getSessionData = async (
    key: string,
  ): Promise<string | undefined> => {
    const fullKey = `${this.sessionPrefix}${key}`;
    this.logger.debug(`Try to get session data for key: ${key}`);
    const raw = await this.redis.get(fullKey);
    if (!raw) {
      return undefined;
    }
    return raw;
  };

  /**
   * Deletes session data from Redis.
   * @param key - Session key
   */
  protected deleteSessionData = async (key: string): Promise<void> => {
    const fullKey = `${this.sessionPrefix}${key}`;
    this.logger.debug(`Try to delete session data for key: ${key}`);
    await this.redis.del(fullKey);
  };

  /**
   * Generates PKCE codes (code verifier and challenge)
   * @returns Object containing codeVerifier and codeChallenge
   */
  protected generatePKCECodes = (): {
    codeVerifier: string;
    codeChallenge: string;
  } => {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  };
}
