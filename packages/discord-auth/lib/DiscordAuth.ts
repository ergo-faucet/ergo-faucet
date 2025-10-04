import axios from 'axios';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { v4 as uuidv4 } from 'uuid';
import { FastifySeverInstance } from '@ergo-faucet/fastify-server';
import { DiscordAction } from '@ergo-faucet/database';
import {
  CallBackRouteQuery,
  CallBackRouteQueryType,
  discordToken,
  ErrorResponse,
  userDiscordData,
  DiscordAuthConfig,
  SessionData,
  LoginRouteQuery,
  LoginRouteResponse200,
} from './types';
import { userRequestPayload } from '@ergo-faucet/common-types';
import { AbstractOAuth } from '@ergo-faucet/abstract-oauth';
export class DiscordAuth extends AbstractOAuth {
  private static instance: DiscordAuth;
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
    super(config, 'discordAuth:session:', logger);
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
   * Builds the Discord OAuth2 login URL.
   * @param frontState - State parameter from the front-end to be included in the session
   * @param userId - ID of the user initiating the login
   * @returns Fully qualified Discord login URL with all query params
   */
  private buildLoginURL = async (
    frontState: string,
    userId: number,
  ): Promise<string> => {
    const state = uuidv4();
    const value = { frontState, userId };
    const encodedValue = Buffer.from(JSON.stringify(value), 'utf-8').toString(
      'base64url',
    );

    await this.setSessionData(state, encodedValue, this.sessionTTL);

    const params = new URLSearchParams({
      client_id: this.clientID,
      redirect_uri: this.redirectURL,
      response_type: 'code',
      scope: this.scope,
      state,
    });

    return `${this.DISCORD_OAUTH_URL}/authorize?${params.toString()}`;
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
        preHandler: this.fastifyServer.authPreHandler(),
        schema: {
          querystring: LoginRouteQuery,
          response: {
            200: LoginRouteResponse200,
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
        let decodedSession: SessionData | undefined;

        if (!code || !state) {
          return reply.redirect(
            this.buildRedirectURL(
              'discord',
              '',
              'failed',
              'Missing code or state from Discord callback',
            ),
          );
        }

        try {
          const session = await this.getSessionData(state);
          if (!session) {
            return reply.redirect(
              this.buildRedirectURL(
                'discord',
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

          const tokenData: discordToken = await this.exchangeCodeForToken(code);
          const accessToken = tokenData.accessToken;
          const refreshToken = tokenData.refreshToken;

          const discordUser: userDiscordData =
            await this.fetchDiscordUser(accessToken);

          if (this.action instanceof DiscordAction)
            await this.action.linkDiscordAccount(
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

          return reply.redirect(
            this.buildRedirectURL(
              'discord',
              decodedSession.frontState,
              'success',
              `The user with username ${discordUser.username} logged in successfully with Discord`,
            ),
          );
        } catch (err) {
          this.logger.error(`Discord callback failed`, {
            message: err instanceof Error ? err.message : err,
            stack: err instanceof Error ? err.stack : undefined,
          });
          return reply.redirect(
            this.buildRedirectURL(
              'discord',
              decodedSession?.frontState ?? '',
              'failed',
              'Failed to log in with Discord',
            ),
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
