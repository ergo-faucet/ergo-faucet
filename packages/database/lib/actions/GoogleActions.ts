import { DataSource, Not, Repository } from '@rosen-bridge/extended-typeorm';
import { User, UserAuthStatus, AuthMethod } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class GoogleAction {
  private static instance: GoogleAction;
  private logger: AbstractLogger;
  private userRepository: Repository<User>;
  private userAuthStatusRepository: Repository<UserAuthStatus>;
  private authMethodRepository: Repository<AuthMethod>;
  private googleAuthMethod!: AuthMethod;

  /**
   * Private constructor to enforce singleton usage.
   *
   * @param dataSource - TypeORM DataSource for database connections
   * @param logger - Optional logger instance (defaults to DummyLogger)
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.userRepository = dataSource.getRepository(User);
    this.userAuthStatusRepository = dataSource.getRepository(UserAuthStatus);
    this.authMethodRepository = dataSource.getRepository(AuthMethod);
  }

  /**
   * Initializes the GoogleAction singleton instance.
   *
   * @param dataSource - TypeORM DataSource for database operations
   * @param logger - Optional logger instance
   * @throws Error if already initialized
   */
  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance)
      throw new Error('GoogleAction instance has already been initialized.');
    this.instance = new GoogleAction(dataSource, logger);
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
   * Ensures the `google` AuthMethod is seeded in the database.
   *
   * - Checks if an AuthMethod with name `google` exists.
   * - If missing, creates it with an empty config.
   *
   * @returns Promise<void>
   */
  public async ensureGoogleAuthMethod(): Promise<void> {
    let googleMethod = await this.authMethodRepository.findOne({
      where: { name: 'google' },
    });
    if (!googleMethod) {
      googleMethod = this.authMethodRepository.create({
        name: 'google',
        config: JSON.stringify({}),
      });
      this.googleAuthMethod =
        await this.authMethodRepository.save(googleMethod);
    } else {
      this.googleAuthMethod = googleMethod;
    }
    this.logger.debug('Seeded AuthMethod: google');
  }

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
    user.metadata = {
      ...user.metadata,
      google: {
        name: name ?? undefined,
        email: email ?? undefined,
      },
    };

    const savedUser = await this.userRepository.save(user);
    this.logger.debug(`Linked Google ID ${google_id} to user ID ${userId}`);

    const expiresAt = new Date(Date.now() + expiresTime * 1000);

    await this.saveOrUpdateGoogleAuthStatus(
      savedUser,
      expiresAt,
      access_token,
      refresh_token,
    );
  };

  /**
   * Creates or updates the `UserAuthStatus` record for a user's Google authentication.
   *
   * @param user - User entity already saved in DB
   * @param expiresAt - Token expiration date
   * @param accessToken - Google OAuth2 access token
   * @param refreshToken - Google OAuth2 refresh token
   * @returns Promise<void>
   */
  private saveOrUpdateGoogleAuthStatus = async (
    user: User,
    expiresAt: Date,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> => {
    let authStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user: { id: user.id },
        authMethod: { id: this.googleAuthMethod.id },
      },
      relations: ['authMethod', 'user'],
    });

    if (!authStatus) {
      authStatus = this.userAuthStatusRepository.create({
        user,
        authMethod: this.googleAuthMethod,
        verifiedAt: new Date(),
        status: 'passed',
        expiresAt,
        metadata: {
          token: accessToken,
          refresh_token: refreshToken,
        },
      });
    } else {
      authStatus.verifiedAt = new Date();
      authStatus.status = 'passed';
      authStatus.expiresAt = expiresAt;
      authStatus.metadata = {
        token: accessToken,
        refresh_token: refreshToken,
      };
    }

    await this.userAuthStatusRepository.save(authStatus);
    this.logger.debug(
      `Saved/Updated Google UserAuthStatus for user ID ${user.id}`,
    );
  };
}

export { GoogleAction };
