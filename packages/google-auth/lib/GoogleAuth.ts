import Redis from 'ioredis';
import axios from 'axios';
import crypto from 'crypto';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { GoogleAction } from '@ergo-faucet/database';
import {
  CallBackRouteQuery,
  CallBackRouteQueryType,
  CallBackRouteResponse200,
  GoogleToken,
  ErrorResponse,
  GoogleUserData,
  GoogleAuthConfig,
  SessionData,
} from './types';
import { userRequestPayload } from '@ergo-faucet/common-types';
export class GoogleAuth {
  private static instance: GoogleAuth;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly googleAction: GoogleAction;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectURL: string;
  private readonly scope: string;
  private readonly expiresTime: number;
  private readonly redis: Redis;
  private readonly sessionTTL: number;
  private readonly SESSION_PREFIX = 'googleAuth:session:';
  private readonly GOOGLE_AUTH_PREFIX = '/auth/google';
  private readonly GOOGLE_OAUTH_URL =
    'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly GOOGLE_API_URL =
    'https://www.googleapis.com/oauth2/v2/userinfo';
  private readonly GRANT_TYPE = 'authorization_code';

  /**
   * Private constructor to enforce singleton pattern.
   *
   * @param config - Google configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  private constructor(config: GoogleAuthConfig, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.fastifyServer = config.fastifyServer;
    this.googleAction = config.googleAction;
    this.clientId = config.clientID;
    this.clientSecret = config.clientSecret;
    this.redirectURL = config.redirectURL;
    this.scope = config.scope;
    this.expiresTime = config.expiresTime;
    this.redis = new Redis(config.redis);
    this.sessionTTL = config.sessionTTL;
  }

  /**
   * Initializes the singleton instance.
   *
   * @param config - Google configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance
   */
  public static initialize = async (
    config: GoogleAuthConfig,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance) {
      throw new Error('GoogleAuth has already been initialized.');
    }
    this.instance = new GoogleAuth(config, logger);
    await this.instance.googleAction.ensureGoogleAuthMethod();
    await this.instance.registerRoutes(this.instance.GOOGLE_AUTH_PREFIX);
    this.instance.logger.info(`GoogleAuth initialized successfully.`);
  };

  /**
   * Returns the singleton instance after initialization.
   * @returns GoogleAuth instance
   */
  public static getInstance = (): GoogleAuth => {
    if (!this.instance) {
      throw new Error('GoogleAuth instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Sets session data in Redis with TTL.
   * @param key - Session key
   * @param value - Session data
   * @param ttl - Time to live in seconds
   */
  private async setSessionData(
    key: string,
    value: SessionData,
    ttl: number,
  ): Promise<void> {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    try {
      await this.redis.set(fullKey, JSON.stringify(value));
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
  private async getSessionData(key: string): Promise<SessionData | null> {
    const fullKey = `${this.SESSION_PREFIX}${key}`;
    try {
      const raw = await this.redis.get(fullKey);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as SessionData;
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
   * Builds the Google OAuth2 login URL with PKCE.
   * @returns Fully qualified Google login URL with all query params
   */
  private buildLoginURL = async (): Promise<string> => {
    const { codeVerifier, codeChallenge } = this.generatePKCECodes();
    const state = crypto.randomBytes(16).toString('hex');

    await this.setSessionData(state, { codeVerifier }, this.sessionTTL);

    return `${this.GOOGLE_OAUTH_URL}?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(
      this.redirectURL,
    )}&scope=${encodeURIComponent(this.scope)}&state=${state}&access_type=offline&prompt=consent&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  };

  /**
   * Fetches the Google user profile using the given OAuth2 access token.
   * @param accessToken - Google OAuth2 access token
   * @returns Google user data mapped to `GoogleUserData`
   */
  private fetchGoogleUser = async (
    accessToken: string,
  ): Promise<GoogleUserData> => {
    const res = await axios.get(this.GOOGLE_API_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const userData: GoogleUserData = {
      userId: res.data.id,
      email: res.data.email,
      name: res.data.name,
    };

    return userData;
  };

  /**
   * Exchanges the authorization `code` for Google OAuth2 access/refresh tokens.
   * @param code - Authorization code returned by Google after login
   * @param codeVerifier - PKCE code verifier
   * @returns `GoogleToken` containing accessToken, refreshToken, and expiry
   */
  private exchangeCodeForToken = async (
    code: string,
    codeVerifier: string,
  ): Promise<GoogleToken> => {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectURL,
      grant_type: this.GRANT_TYPE,
      code,
      code_verifier: codeVerifier,
    });

    const res = await axios.post(this.GOOGLE_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData: GoogleToken = {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresInSecond: res.data.expires_in,
    };

    return tokenData;
  };

  /**
   * Registers the `/login` route:
   *
   * **GET `/google/login`**
   * - Requires JWT auth
   * - Redirects the user to the Google OAuth2 login page
   *
   * @param fastify - Fastify instance
   */
  private loginRoute = async (fastify: FastifySeverInstance) => {
    fastify.get(
      '/login',
      {
        // preHandler: this.fastifyServer.authPreHandler,
        schema: {
          response: {
            302: { description: 'Redirect to Google OAuth2 login' },
            401: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (_, reply) => {
        const loginURL = await this.buildLoginURL();
        return reply.status(302).redirect(loginURL);
      },
    );
  };

  /**
   * Registers the `/callback` route:
   *
   * **GET `/google/callback`**
   * - Requires JWT auth
   * - Expects `code` and `state` query params
   * - Exchanges code for tokens, fetches Google user, links account to the user
   *
   * @param fastify - Fastify instance
   */
  private callbackRoute = async (fastify: FastifySeverInstance) => {
    fastify.get<{ Querystring: CallBackRouteQueryType }>(
      '/callback',
      {
        preHandler: this.fastifyServer.authPreHandler,
        schema: {
          querystring: CallBackRouteQuery,
          response: {
            200: CallBackRouteResponse200,
            400: ErrorResponse,
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
        const { code, state } = request.query;
        const user = request.user as userRequestPayload;

        if (!code || !state || !user.userId) {
          return reply
            .status(400)
            .send({ error: 'Missing code, state, or userId' });
        }

        const session = await this.getSessionData(state);
        if (!session) {
          return reply.status(400).send({ error: 'Invalid or expired state' });
        }

        const { codeVerifier } = session;
        await this.deleteSessionData(state);

        try {
          const tokenData: GoogleToken = await this.exchangeCodeForToken(
            code,
            codeVerifier,
          );
          const accessToken = tokenData.accessToken;
          const refreshToken = tokenData.refreshToken;

          const googleUser: GoogleUserData =
            await this.fetchGoogleUser(accessToken);

          await this.googleAction.linkGoogleAccount(
            Number(user.userId),
            googleUser.userId,
            googleUser.name,
            googleUser.email,
            this.expiresTime,
            accessToken,
            refreshToken,
          );

          return reply.status(200).send({
            success: true,
            message: `The user with id ${user.userId} logged in successfully with Google`,
          });
        } catch (err) {
          if (err instanceof Error) {
            this.logger.error(`Google callback failed`, {
              message: err.message,
              stack: err.stack,
            });
          }
          return reply
            .status(500)
            .send({ error: 'Google authentication failed' });
        }
      },
    );
  };

  /**
   * Registers the API routes for GoogleAuth.
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
