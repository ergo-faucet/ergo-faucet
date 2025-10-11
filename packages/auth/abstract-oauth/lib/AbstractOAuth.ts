import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import Redis from 'ioredis';
import crypto from 'crypto';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import {
  AuthConfig,
  CallBackRouteQuery,
  CallBackRouteQueryType,
  ErrorResponse,
  LoginRouteQuery,
  LoginRouteResponse200,
  SessionData,
  TokenData,
} from './types';
import { UserRequestPayload, UserData } from '@ergo-faucet/common-types';

export abstract class AbstractOAuth {
  protected readonly fastifyServer: FastifyAPIServer;
  protected readonly clientID: string;
  protected readonly clientSecret: string;
  protected readonly redirectURL: string;
  protected readonly scope: string;
  protected readonly expiresTime: number;
  protected readonly sessionTTL: number;
  protected readonly frontBaseURL: string;
  protected readonly redis: Redis;
  protected readonly action: AuthConfig['action'];
  protected logger: AbstractLogger;
  protected abstract authName: string;

  constructor(config: AuthConfig, logger?: AbstractLogger) {
    this.clientID = config.clientID;
    this.clientSecret = config.clientSecret;
    this.redirectURL = config.redirectURL;
    this.scope = config.scope;
    this.expiresTime = config.expiresTime;
    this.sessionTTL = config.sessionTTL;
    this.logger = logger ?? new DummyLogger();
    this.frontBaseURL = config.frontBaseURL;
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
    const fullKey = `${this.authName + ':session:'}${key}`;
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
    const fullKey = `${this.authName + ':session:'}${key}`;
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
    const fullKey = `${this.authName + ':session:'}${key}`;
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

  protected abstract buildLoginURL(
    frontState: string,
    userId: number,
  ): Promise<string>;
  protected abstract fetchUser(accessToken: string): Promise<UserData>;
  protected abstract exchangeCodeForToken(
    code: string,
    SessionData: SessionData,
  ): Promise<TokenData>;

  /**
   * Defines the /login route for initiating the OAuth2 login process.
   *
   * @param fastify Fastify server instance
   */
  protected loginRoute = async (fastify: FastifySeverInstance) => {
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
          const stateFromFront = request.query.state ?? '';
          const user = request.user as UserRequestPayload;
          const loginURL = await this.buildLoginURL(
            stateFromFront,
            user.userId,
          );
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
   * **GET `/discord/callback`**
   * - Requires JWT auth
   * - Expects a `code` query param
   * - Exchanges code for tokens, fetches Discord user, links account to the user
   *
   * @param fastify - Fastify instance
   */
  protected callbackRoute = async (fastify: FastifySeverInstance) => {
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
        let decodedSession: SessionData | undefined;

        if (!code || !state) {
          return reply.redirect(
            this.buildRedirectURL(
              this.authName,
              '',
              'failed',
              `Missing code or state from ${this.authName} callback`,
            ),
          );
        }

        try {
          const session = await this.getSessionData(state);
          if (!session) {
            return reply.redirect(
              this.buildRedirectURL(
                this.authName,
                '',
                'failed',
                'Session expired or invalid',
              ),
            );
          }
          await this.deleteSessionData(state);
          decodedSession = JSON.parse(
            Buffer.from(session, 'base64url').toString('utf-8'),
          ) as SessionData;

          const tokenData: TokenData = await this.exchangeCodeForToken(
            code,
            decodedSession,
          );
          const accessToken = tokenData.accessToken;
          const refreshToken = tokenData.refreshToken;

          const userData: UserData = await this.fetchUser(accessToken);

          await this.action.linkAccount(
            Number(decodedSession.userId),
            userData,
            this.expiresTime,
            accessToken,
            refreshToken,
          );

          return reply.redirect(
            this.buildRedirectURL(
              this.authName,
              decodedSession.frontState,
              'success',
              `The user logged in successfully with ${this.authName}`,
            ),
          );
        } catch (err) {
          this.logger.error(`${this.authName} callback failed`, {
            message: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          return reply.redirect(
            this.buildRedirectURL(
              this.authName,
              decodedSession?.frontState ?? '',
              'failed',
              `Failed to log in with ${this.authName}`,
            ),
          );
        }
      },
    );
  };

  /**
   * Registers the API routes for the OAuth service.
   *
   * @param prefix - URL prefix for the routes
   */
  public registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(this.loginRoute, prefix);
    await this.fastifyServer.register(this.callbackRoute, prefix);
    this.logger.info(`Routes registered under prefix "${prefix}"`);
  };
}
