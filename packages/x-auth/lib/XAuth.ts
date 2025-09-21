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
  LoginRouteQuery,
  LoginRouteResponse200,
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
  private getSessionData = async (key: string): Promise<string | undefined> => {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
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
  private deleteSessionData = async (key: string): Promise<void> => {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    this.logger.debug(`Try to delete session data for key: ${key}`);
    await this.redis.del(fullKey);
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
   * @param userId - ID of the user initiating the login
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

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientID,
      redirect_uri: this.redirectURL,
      scope: this.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.X_OAUTH_URL}?${params.toString()}`;
  };

  /**
   * Builds the front-end redirect URL with query parameters for X-platform OAuth2 login result.
   *
   * @param frontState - State value provided by the front-end to maintain session/context
   * @param status - Result status of the OAuth flow ('success' or 'false')
   * @param message - Optional message to include in the URL (e.g., success or error message)
   * @returns Fully qualified URL string combining the frontBaseURL, frontState, and query parameters
   */
  private buildRedirectURL = (
    frontState: string,
    status: 'success' | 'false',
    message?: string,
  ): string => {
    const params = new URLSearchParams({
      authMethod: 'x-platform',
      authMethodStatus: status,
    });
    if (message) {
      params.set('message', message);
    }

    return `${this.frontBaseURL}${frontState}&${params.toString()}`;
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
          querystring: LoginRouteQuery,
          response: {
            200: LoginRouteResponse200,
            401: ErrorResponse,
            500: ErrorResponse,
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
          const frontState = request.query.state ?? '';
          const user = request.user as userRequestPayload;
          const loginURL = await this.buildLoginURL(frontState, user.userId);
          return reply.status(200).send({ redirectURL: loginURL });
        } catch (err) {
          this.logger.error(`Error in build login url`, {
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
        let decodedSession: SessionData | undefined;

        if (!code || !state) {
          return reply.redirect(
            this.buildRedirectURL(
              '',
              'false',
              'Missing code or state from X-platform callback',
            ),
          );
        }
        try {
          const session = await this.getSessionData(state);
          if (!session) {
            return reply.redirect(
              this.buildRedirectURL('', 'false', 'Session expired or invalid'),
            );
          }
          await this.deleteSessionData(state);
          decodedSession = JSON.parse(
            Buffer.from(session, 'base64url').toString('utf-8'),
          ) as SessionData;

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

          return reply.redirect(
            this.buildRedirectURL(
              decodedSession.frontState,
              'success',
              `The user with username ${xUser.username} logged in successfully with X-platform`,
            ),
          );
        } catch (err) {
          this.logger.error(`X-platform callback failed`, {
            message: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          return reply
            .status(302)
            .redirect(
              this.buildRedirectURL(
                decodedSession?.frontState ?? '',
                'false',
                'Failed to log in with X-platform',
              ),
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
