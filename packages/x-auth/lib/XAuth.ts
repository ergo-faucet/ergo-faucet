import Redis from 'ioredis';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { XAction } from '@ergo-faucet/database';
import axios from 'axios';
import crypto from 'crypto';
import {
  CallBackRouteQuery,
  CallBackRouteQueryType,
  XToken,
  ErrorResponse,
  XUserData,
  XAuthConfig,
  SessionData,
} from './types';
import { userRequestPayload } from '@ergo-faucet/common-types';
import { v4 as uuidv4 } from 'uuid';

export class XAuth {
  private static instance: XAuth;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly xAction: XAction;
  private readonly clientID: string;
  private readonly clientSecret: string;
  private readonly redirectURL: string;
  private readonly scope: string;
  private readonly expiresTime: number;
  private readonly redis: Redis;
  private readonly sessionTTL: number;
  private readonly frontBaseURL: string;
  private readonly SESSION_PREFIX = 'xauth:session:';
  private readonly X_AUTH_PREFIX = '/auth/x-platform';
  private readonly X_OAUTH_URL = 'https://x.com/i/oauth2/authorize';
  private readonly X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
  private readonly X_API_URL = 'https://api.x.com/2/users/me';
  private readonly GRANT_TYPE = 'authorization_code';

  /**
   * Private constructor to enforce singleton pattern.
   *
   * @param config - X-platform configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  private constructor(config: XAuthConfig, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.fastifyServer = config.fastifyServer;
    this.xAction = config.xAction;
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
   * @param config - X-platform configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance
   * @throws Error if already initialized
   */
  public static initialize = async (
    config: XAuthConfig,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance) {
      throw new Error('XAuth has already been initialized.');
    }
    this.instance = new XAuth(config, logger);
    await this.instance.registerRoutes(this.instance.X_AUTH_PREFIX);
    this.instance.logger.info(`XAuth initialized successfully.`);
  };

  /**
   * Returns the singleton instance after initialization.
   * @returns XAuth instance
   * @throws Error if instance not initialized
   */
  public static getInstance = (): XAuth => {
    if (!this.instance) {
      throw new Error('XAuth instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Sets session data in Redis with TTL.
   * @param key - Session key
   * @param value - string data
   * @param ttl - Time to live in seconds
   */
  private setSessionData = async (
    key: string,
    value: string,
    ttl: number,
  ): Promise<void> => {
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
  };

  /**
   * Gets session data from Redis.
   * @param key - Session key
   * @returns Session data or null if not found
   */
  private getSessionData = async (key: string): Promise<string | undefined> => {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    try {
      const raw = await this.redis.get(fullKey);
      if (!raw) {
        return undefined;
      }
      return raw;
    } catch (error) {
      this.logger.error(`Failed to get session data for key: ${key}`, error);
    }
  };

  /**
   * Deletes session data from Redis.
   * @param key - Session key
   */
  private deleteSessionData = async (key: string): Promise<void> => {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.error(`Failed to delete session data for key: ${key}`, error);
    }
  };

  /**
   * Generates PKCE codes (code verifier and challenge)
   * @returns Object containing codeVerifier and codeChallenge
   */
  private generatePKCECodes = (): {
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

  /**
   * Builds the X-platform OAuth2 login URL with PKCE.
   * @param frontState - State parameter from the front-end to be included in the redirect
   * @returns Fully qualified X-platform login URL with all query params
   */
  private buildLoginURL = async (
    frontState: string,
    userId: number,
  ): Promise<string> => {
    const { codeVerifier, codeChallenge } = this.generatePKCECodes();

    const state = uuidv4();
    const value = { frontState, codeVerifier, userId };

    const encodedValue = Buffer.from(JSON.stringify(value), 'utf-8').toString(
      'base64url',
    );

    await this.setSessionData(state, encodedValue, this.sessionTTL);

    return `${this.X_OAUTH_URL}?response_type=code&client_id=${this.clientID}&redirect_uri=${encodeURIComponent(
      this.redirectURL,
    )}&scope=${encodeURIComponent(this.scope)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  };

  /**
   * Fetches the X-platform user profile using the given OAuth2 access token.
   * @param accessToken - X-platform OAuth2 access token
   * @returns X-platform user data mapped to `XUserData`
   */
  private fetchXUser = async (accessToken: string): Promise<XUserData> => {
    const res = await axios.get(this.X_API_URL, {
      params: {
        'user.fields': 'created_at,description,public_metrics',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const userData: XUserData = {
      userId: res.data.data.id,
      username: res.data.data.username,
      name: res.data.data.name,
      join_date: new Date(res.data.data.created_at),
    };

    return userData;
  };

  /**
   * Exchanges the authorization `code` for X-platform OAuth2 access/refresh tokens.
   * @param code - Authorization code returned by X-platform after login
   * @param codeVerifier - PKCE code verifier
   * @returns `XToken` containing accessToken, refreshToken, and expiry
   */
  private exchangeCodeForToken = async (
    code: string,
    codeVerifier: string,
  ): Promise<XToken> => {
    const params = new URLSearchParams({
      client_id: this.clientID,
      redirect_uri: this.redirectURL,
      grant_type: this.GRANT_TYPE,
      code,
      code_verifier: codeVerifier,
    });

    const res = await axios.post(this.X_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientID}:${this.clientSecret}`).toString('base64')}`,
      },
    });

    const tokenData: XToken = {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresInSecond: res.data.expires_in,
    };

    return tokenData;
  };

  /**
   * Registers the `/login` route:
   *
   * **GET `/x-platform/login`**
   * - Requires JWT auth
   * - Redirects the user to the X-platform OAuth2 login page
   *
   * @param fastify - Fastify instance
   */
  private loginRoute = async (fastify: FastifySeverInstance) => {
    fastify.get<{ Querystring: { state?: string } }>(
      '/login',
      {
        preHandler: this.fastifyServer.authPreHandler(),
        schema: {
          querystring: {
            type: 'object',
            properties: {
              state: { type: 'string' },
            },
            required: ['state'],
          },
          response: {
            302: { description: 'Redirect to X OAuth2 login' },
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
        try {
          const frontState = request.query.state;
          const user = request.user as userRequestPayload;
          if (!frontState) {
            return reply
              .status(400)
              .send({ error: 'Missing state from front' });
          }
          const loginURL = await this.buildLoginURL(frontState, user.userId);
          return reply.status(302).redirect(loginURL);
        } catch (err) {
          this.logger.debug(`Error in build login url`, {
            message: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          reply.status(500).send({
            error: 'Internal server error occured',
            code: 'internal-error',
          });
        }
      },
    );
  };

  /**
   * Registers the `/callback` route:
   *
   * **GET `/x-platform/callback`**
   * - Requires JWT auth
   * - Expects `code` and `state` query params
   * - Exchanges code for tokens, fetches X-platform user, links account to the user
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
            302: { description: 'Redirect to front-end with result' },
          },
        },
      },
      async (request, reply) => {
        const { code, state } = request.query;
        if (!code || !state) {
          return reply
            .status(302)
            .redirect(
              this.frontBaseURL +
                `?authMethod=x-platform&authMethodStatus=false`,
            );
        }
        const session = await this.getSessionData(state);
        if (!session) {
          return reply
            .status(302)
            .redirect(
              this.frontBaseURL +
                `?authMethod=x-platform&authMethodStatus=false`,
            );
        }
        await this.deleteSessionData(state);
        const decodedSession = JSON.parse(
          Buffer.from(session, 'base64url').toString('utf-8'),
        ) as SessionData;

        try {
          const tokenData: XToken = await this.exchangeCodeForToken(
            code,
            decodedSession.codeVerifier,
          );
          const accessToken = tokenData.accessToken;
          const refreshToken = tokenData.refreshToken;

          const xUser: XUserData = await this.fetchXUser(accessToken);

          await this.xAction.linkXAccount(
            Number(decodedSession.userId),
            xUser.userId,
            xUser.username,
            xUser.name,
            xUser.join_date,
            this.expiresTime,
            accessToken,
            refreshToken,
          );

          return reply
            .status(302)
            .redirect(
              this.frontBaseURL +
                decodedSession.frontState +
                `?authMethod=x-platform&authMethodStatus=success&message=The user with name ${xUser.name} logged in successfully with X-platform`,
            );
        } catch (err) {
          this.logger.error(`X-platform callback failed`, {
            message: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          return reply
            .status(302)
            .redirect(
              this.frontBaseURL +
                decodedSession.frontState +
                `?authMethod=x-platform&authMethodStatus=false&message=Failed to log in with X-platform`,
            );
        }
      },
    );
  };

  /**
   * Registers the API routes for XAuth.
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
