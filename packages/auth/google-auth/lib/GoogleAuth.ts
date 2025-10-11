import axios from 'axios';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { GoogleToken, GoogleAuthConfig, SessionData } from './types';
import { v4 as uuidv4 } from 'uuid';
import { AbstractOAuth } from '@ergo-faucet/abstract-oauth';
import { UserData } from '@ergo-faucet/common-types';

export class GoogleAuth extends AbstractOAuth {
  private static instance: GoogleAuth;
  private readonly GOOGLE_AUTH_PREFIX = '/auth/google';
  private readonly GOOGLE_OAUTH_URL =
    'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly GOOGLE_API_URL =
    'https://www.googleapis.com/oauth2/v2/userinfo';
  private readonly GRANT_TYPE = 'authorization_code';
  protected authName = 'google';

  /**
   * Private constructor to enforce singleton pattern.
   *
   * @param config - Google configuration parameters including clientId, fastify, ...
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  private constructor(config: GoogleAuthConfig, logger?: AbstractLogger) {
    super(config, logger);
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
  fetchUser = async (accessToken: string): Promise<UserData> => {
    const res = await axios.get(this.GOOGLE_API_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const userData: UserData = {
      userId: res.data.id,
      email: res.data.email,
      name: res.data.name,
    };

    return userData;
  };

  /**
   * Exchanges the authorization `code` for Google OAuth2 access/refresh tokens.
   * @param code - Authorization code returned by Google after login
   * @param sessionData - Session data containing the PKCE code verifier
   * @returns `GoogleToken` containing accessToken, refreshToken, and expiry
   */
  protected exchangeCodeForToken = async (
    code: string,
    sessionData: SessionData,
  ): Promise<GoogleToken> => {
    const params = new URLSearchParams({
      client_id: this.clientID,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectURL,
      grant_type: this.GRANT_TYPE,
      code,
      code_verifier: sessionData.codeVerifier,
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
}
