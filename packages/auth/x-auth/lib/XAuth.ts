import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import axios from 'axios';
import { XToken, XAuthConfig, SessionData } from './types';
import { v4 as uuidv4 } from 'uuid';
import { AbstractOAuth } from '@ergo-faucet/abstract-oauth';
import { UserData } from '@ergo-faucet/common-types';
export class XAuth extends AbstractOAuth {
  private static instance: XAuth;
  private readonly X_AUTH_PREFIX = '/auth/x-platform';
  private readonly X_OAUTH_URL = 'https://x.com/i/oauth2/authorize';
  private readonly X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
  private readonly X_API_URL = 'https://api.x.com/2/users/me';
  private readonly GRANT_TYPE = 'authorization_code';
  protected authName = 'x-platform';

  /**
   * Private constructor to enforce singleton pattern.
   *
   * @param config - X-platform configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  private constructor(config: XAuthConfig, logger?: AbstractLogger) {
    super(config, logger);
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
   * Builds the X-platform OAuth2 login URL with PKCE.
   * @param frontState - State parameter from the front-end to be included in the redirect
   * @param userId - ID of the user initiating the login
   * @returns Fully qualified X-platform login URL with all query params
   */
  buildLoginURL = async (
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
   * Fetches the X-platform user profile using the given OAuth2 access token.
   * @param accessToken - X-platform OAuth2 access token
   * @returns X-platform user data mapped to `XUserData`
   */
  fetchUser = async (accessToken: string): Promise<UserData> => {
    const res = await axios.get(this.X_API_URL, {
      params: {
        'user.fields': 'created_at,description,public_metrics',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const userData: UserData = {
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
  exchangeCodeForToken = async (
    code: string,
    sessionData: SessionData,
  ): Promise<XToken> => {
    const params = new URLSearchParams({
      client_id: this.clientID,
      redirect_uri: this.redirectURL,
      grant_type: this.GRANT_TYPE,
      code,
      code_verifier: sessionData.codeVerifier,
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
}
