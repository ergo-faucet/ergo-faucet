import axios from 'axios';
import Redis from 'ioredis';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import crypto from 'crypto';

import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { DiscordAction } from '@ergo-faucet/database';
import {
  CallBackRouteQuery,
  CallBackRouteQueryType,
  discordToken,
  ErrorResponse,
  userDiscordData,
  DiscordAuthConfig,
  SessionData,
} from './types';
import { userRequestPayload } from '@ergo-faucet/common-types';
export class DiscordAuth {
  private static instance: DiscordAuth;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly discordAction: DiscordAction;

  private readonly clientID: string;
  private readonly clientSecret: string;
  private readonly redirectURL: string;
  private readonly scope: string;
  private readonly expiresTime: number;

  private readonly redis: Redis;
  private readonly sessionTTL: number;
  private readonly frontBaseURL: string;
  private readonly SESSION_PREFIX = 'discordAuth:session:';

  private readonly DISCORD_EPOCH = 1420070400000;
  private readonly GRANT_TYPE = 'authorization_code';
  private readonly Discord_AUTH_PREFIX = '/auth/discord';
  private readonly DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2';
  private readonly DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
  private readonly DISCORD_API_URL = 'https://discord.com/api/users/@me';

  /**
   * Private constructor to enforce singleton pattern.
   *
   * @param config - Discord configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  private constructor(config: DiscordAuthConfig, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.fastifyServer = config.fastifyServer;
    this.discordAction = config.discordAction;
    this.clientID = config.clientID;
    this.clientSecret = config.clientSecret;
    this.redirectURL = config.redirectURL;
    this.scope = config.scope;
    this.expiresTime = config.expiresTime;
    this.redis = new Redis(config.redis);
    this.sessionTTL = config.sessionTTL;
    this.frontBaseURL = config.frontBaseURL;
  }

  /**
   * Initializes the singleton instance.
   *
   * @param config - Discord configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance
   * @throws Error if already initialized
   */
  public static initialize = async (
    config: DiscordAuthConfig,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance) {
      throw new Error('DiscordAuth has already been initialized.');
    }
    this.instance = new DiscordAuth(config, logger);
    await this.instance.discordAction.ensureDiscordAuthMethod();
    await this.instance.registerRoutes(this.instance.Discord_AUTH_PREFIX);
    this.instance.logger.info(`DiscordAuth initialized successfully.`);
  };
  /**
   * Returns the singleton instance after initialization.
   * @returns DiscordAuth instance
   * @throws Error if instance not initialized
   */
  public static getInstance = (): DiscordAuth => {
    if (!this.instance) {
      throw new Error('DiscordAuth instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Sets session data in Redis with TTL.
   * @param key - Session key
   * @param value - string data
   * @param ttl - Time to live in seconds
   */
  private async setSessionData(
    key: string,
    value: string,
    ttl: number,
  ): Promise<void> {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    try {
      await this.redis.set(fullKey, value);
      if (ttl) {
        await this.redis.expire(fullKey, ttl);
      }
    } catch (error) {
      this.logger.error(`Failed to set session data for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Gets session data from Redis.
   * @param key - Session key
   * @returns Session data or null if not found
   */
  private async getSessionData(key: string): Promise<string | null> {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    try {
      const raw = await this.redis.get(fullKey);
      if (!raw) {
        return null;
      }
      return raw;
    } catch (error) {
      this.logger.error(`Failed to get session data for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Deletes session data from Redis.
   * @param key - Session key
   */
  private async deleteSessionData(key: string): Promise<void> {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.error(`Failed to delete session data for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Builds the Discord OAuth2 login URL.
   * @param frontState - State parameter from the front-end to be included in the session
   * @param userId - ID of the user initiating the login
   * @returns Fully qualified Discord login URL with all query params
   */
  private buildLoginURL = async (
    frontState: string,
    userId: number,
  ): Promise<string> => {
    const state = crypto.randomBytes(16).toString('hex');
    const value = { frontState, userId };
    const encodedValue = Buffer.from(JSON.stringify(value), 'utf-8').toString(
      'base64url',
    );

    await this.setSessionData(state, encodedValue, this.sessionTTL);

    return `${this.DISCORD_OAUTH_URL}/authorize?client_id=${this.clientID}&redirect_uri=${encodeURIComponent(
      this.redirectURL,
    )}&response_type=code&scope=${this.scope}&state=${state}`;
  };

  /**
   * Fetches the Discord user profile using the given OAuth2 access token.
   * @param accessToken - Discord OAuth2 access token
   * @returns Discord user data mapped to `userDiscordData`
   */
  private fetchDiscordUser = async (
    accessToken: string,
  ): Promise<userDiscordData> => {
    const res = await axios.get(this.DISCORD_API_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData: userDiscordData = {
      userId: res.data.id,
      username: res.data.username,
      email: res.data.email,
      global_name: res.data.global_name,
      join_date: new Date(parseInt(res.data.id) / 4194304 + this.DISCORD_EPOCH),
    };
    return userData;
  };

  /**
   * Exchanges the authorization `code` for Discord OAuth2 access/refresh tokens.
   * @param code - Authorization code returned by Discord after login
   * @returns `discordToken` containing accessToken, refreshToken, and expiry
   */
  private exchangeCodeForToken = async (
    code: string,
  ): Promise<discordToken> => {
    const params = new URLSearchParams({
      client_id: this.clientID,
      client_secret: this.clientSecret,
      grant_type: this.GRANT_TYPE,
      code,
      redirect_uri: this.redirectURL,
    });

    const res = await axios.post(this.DISCORD_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const discordTokenData: discordToken = {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresInSecond: res.data.expires_in,
    };

    return discordTokenData;
  };

  /**
   * Registers the `/login` route:
   *
   * **GET `/discord/login`**
   * - Requires JWT auth
   * - Redirects the user to the Discord OAuth2 login page
   *
   * @param fastify - Fastify instance
   */
  private loginRoute = async (fastify: FastifySeverInstance) => {
    fastify.get<{ Querystring: { state?: string } }>(
      '/login',
      {
        preHandler: this.fastifyServer.authPreHandler,
        schema: {
          querystring: {
            type: 'object',
            properties: {
              state: { type: 'string' },
            },
            required: ['state'],
          },
          response: {
            302: { description: 'Redirect to Discord OAuth2 login' },
            401: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (request, reply) => {
        const frontState = request.query.state;
        const user = request.user as userRequestPayload;
        if (!frontState) {
          return reply
            .status(400)
            .send({ error: 'Missing state from front', code: 'MISSING_STATE' });
        }
        const loginURL = await this.buildLoginURL(frontState, user.userId);
        return reply.status(302).redirect(loginURL);
      },
    );
  };

  /**
   * Registers the `/callback` route:
   *
   * **GET `/discord/callback`**
   * - Requires JWT auth
   * - Expects a `code` query param
   * - Exchanges code for tokens, fetches Discord user, links account to the user
   *
   * @param fastify - Fastify instance
   */
  private callbackRoute = async (fastify: FastifySeverInstance) => {
    fastify.get<{ Querystring: CallBackRouteQueryType }>(
      '/callback',
      {
        schema: {
          querystring: CallBackRouteQuery,
          response: {
            302: { description: 'Redirect to front-end with auth result' },
          },
        },
      },
      async (request, reply) => {
        const { code, state } = request.query;

        if (!code || !state) {
          return reply
            .status(302)
            .redirect(
              this.frontBaseURL + `?authMethod=discord&authMethodStatus=false`,
            );
        }
        const session = await this.getSessionData(state);
        if (!session) {
          return reply
            .status(302)
            .redirect(
              this.frontBaseURL + `?authMethod=discord&authMethodStatus=false`,
            );
        }
        this.deleteSessionData(state);
        const decodedSession = JSON.parse(
          Buffer.from(session, 'base64url').toString('utf-8'),
        ) as SessionData;

        try {
          const tokenData: discordToken = await this.exchangeCodeForToken(code);
          const accessToken = tokenData.accessToken;
          const refreshToken = tokenData.refreshToken;

          const discordUser: userDiscordData =
            await this.fetchDiscordUser(accessToken);

          await this.discordAction.linkDiscordAccount(
            Number(decodedSession.userId),
            discordUser.userId,
            discordUser.username,
            discordUser.join_date,
            this.expiresTime,
            accessToken,
            refreshToken,
            discordUser.email,
            discordUser.global_name,
          );

          return reply
            .status(302)
            .redirect(
              this.frontBaseURL +
                decodedSession.frontState +
                `?authMethod=discord&authMethodStatus=success&message=The user with id ${decodedSession.userId} logged in successfully with Discord`,
            );
        } catch (err) {
          this.logger.error(`Discord callback failed`, {
            message: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          return reply
            .status(302)
            .redirect(
              this.frontBaseURL +
                decodedSession.frontState +
                `?authMethod=discord&authMethodStatus=false&message=The user with id ${decodedSession.userId} failed to log in with Discord`,
            );
        }
      },
    );
  };

  /**
   * Registers the API routes for DiscordAuth.
   * @param prefix - URL prefix for the routes
   * @returns Promise<void>
   * under the specified prefix.
   */
  public registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(this.loginRoute, prefix);
    await this.fastifyServer.register(this.callbackRoute, prefix);
    this.logger.info(`Routes registered under prefix "${prefix}"`);
  };
}
