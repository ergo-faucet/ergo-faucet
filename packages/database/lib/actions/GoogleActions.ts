import { DataSource, Not } from '@rosen-bridge/extended-typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractAuthAction } from './AbstractAuthAction';

class GoogleAction extends AbstractAuthAction {
  private static instance: GoogleAction;
  readonly authMethodName = 'google';

  /**
   * Private constructor to enforce singleton usage.
   *
   * @param dataSource - TypeORM DataSource for database connections
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, logger);
  }

  /**
   * Initializes the GoogleAction singleton instance.
   *
   * @param dataSource - TypeORM DataSource for database operations
   * @param logger - Optional logger instance
   * @throws Error if already initialized
   */
  public static initialize = async (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance)
      throw new Error('GoogleAction instance has already been initialized.');
    this.instance = new GoogleAction(dataSource, logger);
    await this.instance.ensureAuthMethod();
  };

  /**
   * Returns the singleton instance after initialization.
   * @returns GoogleAction instance
   * @throws Error if not initialized
   */
  public static getInstance = (): GoogleAction => {
    if (!this.instance)
      throw new Error('GoogleAction instance has not been initialized.');
    return this.instance;
  };
  /**
   * Links a Google account to an already existing User.
   *
   * @param userId - Existing application User ID
   * @param google_id - Google User ID (string from Google API)
   * @param name - Google display name
   * @param email - User email from Google
   * @param expiresTime - Token expiration time in seconds
   * @param access_token - Google OAuth2 access token
   * @param refresh_token - Google OAuth2 refresh token
   * @returns Promise<void>
   */
  public linkGoogleAccount = async (
    userId: number,
    google_id: string,
    name: string,
    email: string,
    expiresTime: number,
    access_token: string,
    refresh_token: string,
  ): Promise<void> => {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error(`User with ID ${userId} not found`);

    if (user.google_id != null && user.google_id !== google_id) {
      throw new Error(
        `User ${userId} already linked a different Google account`,
      );
    }

    const existingUserWithGoogle = await this.userRepository.findOne({
      where: { google_id: google_id, id: Not(userId) },
    });

    if (existingUserWithGoogle) {
      throw new Error(
        `This Google account is already linked with another user (${existingUserWithGoogle.id})`,
      );
    }

    user.google_id = google_id;
    user.name = user.name ?? name ?? undefined;
    user.modifiedAt = Math.floor(Date.now() / 1000);
    user.metadata = {
      ...user.metadata,
      google: {
        name: name ?? undefined,
        email: email ?? undefined,
      },
    };

    const savedUser = await this.userRepository.save(user);
    this.logger.debug(`Linked Google ID ${google_id} to user ID ${userId}`);

    const expiresAt = Date.now() + expiresTime * 1000;

    await this.saveOrUpdateAuthStatus(
      savedUser,
      expiresAt,
      access_token,
      refresh_token,
    );
  };
}

export { GoogleAction };
