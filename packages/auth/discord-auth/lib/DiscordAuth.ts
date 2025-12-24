import axios from 'axios';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { v4 as uuidv4 } from 'uuid';
import { DiscordToken, DiscordAuthConfig } from './types';
import { AbstractOAuth } from '@ergo-faucet/abstract-oauth';
import { UserData } from '@ergo-faucet/common-types';
export class DiscordAuth extends AbstractOAuth {
  private static instance: DiscordAuth;
  private readonly DISCORD_EPOCH = 1420070400000;
  private readonly GRANT_TYPE = 'authorization_code';
  private readonly Discord_AUTH_PREFIX = '/auth/discord';
  private readonly DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2';
  private readonly DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
  private readonly DISCORD_API_URL = 'https://discord.com/api/users/@me';
  protected authName = 'discord';

  /**
   * Private constructor to enforce singleton pattern.
   *
   * @param config - Discord configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  private constructor(config: DiscordAuthConfig, logger?: AbstractLogger) {
    super(config, logger);
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

  buildLoginURL = async (
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
  fetchUser = async (accessToken: string): Promise<UserData> => {
    const res = await axios.get(this.DISCORD_API_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData: UserData = {
      userId: res.data.id,
      username: res.data.username,
      email: res.data.email,
      name: res.data.global_name,
      join_date: new Date(parseInt(res.data.id) / 4194304 + this.DISCORD_EPOCH),
    };
    return userData;
  };

  /**
   * Exchanges the authorization `code` for Discord OAuth2 access/refresh tokens.
   * @param code - Authorization code returned by Discord after login
   * @returns `discordToken` containing accessToken, refreshToken, and expiry
   */
  exchangeCodeForToken = async (code: string): Promise<DiscordToken> => {
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

    const discordTokenData: DiscordToken = {
      accessToken: res.data.access_token,
      refreshToken: res.data.refresh_token,
      expiresInSecond: res.data.expires_in,
    };

    return discordTokenData;
  };
}
