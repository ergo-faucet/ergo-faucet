import axios from 'axios';
import { FastifySeverInstance } from '@ergo-faucet/fastify-server';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { GoogleAction } from '@ergo-faucet/database';
import {
  CallBackRouteQuery,
  CallBackRouteQueryType,
  GoogleToken,
  ErrorResponse,
  GoogleUserData,
  GoogleAuthConfig,
  SessionData,
  LoginRouteQuery,
  LoginRouteResponse200,
} from './types';
import { userRequestPayload } from '@ergo-faucet/common-types';
import { v4 as uuidv4 } from 'uuid';
import { AbstractOAuth } from '@ergo-faucet/abstract-oauth';

export class GoogleAuth extends AbstractOAuth {
  private static instance: GoogleAuth;
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
    super(config, 'googleAuth:session:', logger);
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
   * Builds the Google OAuth2 login URL with PKCE.
   * @param frontState - State parameter from the frontend
   * @param userId - ID of the user initiating the login
   * @returns Fully qualified Google login URL with all query params
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
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.GOOGLE_OAUTH_URL}?${params.toString()}`;
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
      client_id: this.clientID,
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
          const user = request.user as userRequestPayload;
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
   * **GET `/google/callback`**
   * - Expects `code` and `state` query params
   * - Exchanges code for tokens, fetches Google user, links account to the user
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
              'google',
              '',
              'failed',
              'Missing code or state from Google callback',
            ),
          );
        }

        try {
          const session = await this.getSessionData(state);
          if (!session) {
            return reply.redirect(
              this.buildRedirectURL(
                'google',
                '',
                'failed',
                'Session expired or invalid',
              ),
            );
          }

          decodedSession = JSON.parse(
            Buffer.from(session, 'base64url').toString('utf-8'),
          ) as SessionData;
          await this.deleteSessionData(state);

          const tokenData: GoogleToken = await this.exchangeCodeForToken(
            code,
            decodedSession.codeVerifier,
          );
          const accessToken = tokenData.accessToken;
          const refreshToken = tokenData.refreshToken;

          const googleUser: GoogleUserData =
            await this.fetchGoogleUser(accessToken);

          if (this.action instanceof GoogleAction)
            await this.action.linkGoogleAccount(
              Number(decodedSession.userId),
              googleUser.userId,
              googleUser.name,
              googleUser.email,
              this.expiresTime,
              accessToken,
              refreshToken,
            );

          return reply.redirect(
            this.buildRedirectURL(
              'google',
              decodedSession.frontState,
              'success',
              `The user with name ${googleUser.name} logged in successfully with Google`,
            ),
          );
        } catch (err) {
          this.logger.error(`Google callback failed`, {
            message: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          return reply.redirect(
            this.buildRedirectURL(
              'google',
              decodedSession?.frontState ?? '',
              'failed',
              'Failed to log in with Google',
            ),
          );
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
