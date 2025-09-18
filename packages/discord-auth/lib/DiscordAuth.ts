import axios from 'axios';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { DiscordAction } from '@ergo-faucet/database';
import {
  CallBackRouteQuery,
  CallBackRouteQueryType,
  CallBackRouteResponse200,
  discordToken,
  ErrorResponse,
  userDiscordData,
  DiscordAuthConfig,
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
   * @returns Fully qualified Discord login URL with all query params
   */
  private buildLoginURL = (): string => {
    return `${this.DISCORD_OAUTH_URL}/authorize?client_id=${this.clientID}&redirect_uri=${encodeURIComponent(
      this.redirectURL,
    )}&response_type=code&scope=${this.scope}`;
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
    fastify.get(
      '/login',
      {
        preHandler: this.fastifyServer.authPreHandler(),
        schema: {
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
      async (_, reply) => {
        const loginURL = this.buildLoginURL();
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
        preHandler: this.fastifyServer.authPreHandler(),
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
        const { code } = request.query;
        const user = request.user as userRequestPayload;

        if (!code || !user.userId) {
          return reply.status(400).send({ error: 'Missing code or userId' });
        }

        try {
          const tokenData: discordToken = await this.exchangeCodeForToken(code);
          const accessToken = tokenData.accessToken;
          const refreshToken = tokenData.refreshToken;

          const discordUser: userDiscordData =
            await this.fetchDiscordUser(accessToken);

          await this.discordAction.linkDiscordAccount(
            Number(user.userId),
            discordUser.userId,
            discordUser.username,
            discordUser.join_date,
            this.expiresTime,
            accessToken,
            refreshToken,
            discordUser.email,
            discordUser.global_name,
          );

          return reply.status(200).send({
            success: true,
            message: `The user with id ${user.userId} logged in successfully in discord`,
          });
        } catch (err) {
          if (err instanceof Error) {
            this.logger.error(`Discord callback failed`, {
              message: err.message,
              stack: err.stack,
            });
          }
          return reply
            .status(500)
            .send({ error: 'Discord authentication failed' });
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
