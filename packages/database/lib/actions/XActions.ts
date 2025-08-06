import { DataSource, Not, Repository } from '@rosen-bridge/extended-typeorm';
import { User, UserAuthStatus, AuthMethod } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class XAction {
  private static instance: XAction;
  private logger: AbstractLogger;
  private userRepository: Repository<User>;
  private userAuthStatusRepository: Repository<UserAuthStatus>;
  private authMethodRepository: Repository<AuthMethod>;
  private xAuthMethod!: AuthMethod;

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
   * Initializes the XAction singleton instance.
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
      throw new Error('XAction instance has already been initialized.');
    this.instance = new XAction(dataSource, logger);
  };

  /**
   * Returns the singleton instance after initialization.
   * @returns XAction instance
   * @throws Error if not initialized
   */
  public static getInstance = (): XAction => {
    if (!this.instance)
      throw new Error('XAction instance has not been initialized.');
    return this.instance;
  };

  /**
   * Ensures the `x` AuthMethod is seeded in the database.
   *
   * - Checks if an AuthMethod with name `x` exists.
   * - If missing, creates it with an empty config.
   *
   * @returns Promise<void>
   */
  public async ensureXAuthMethod(): Promise<void> {
    let xMethod = await this.authMethodRepository.findOne({
      where: { name: 'x' },
    });
    if (!xMethod) {
      xMethod = this.authMethodRepository.create({
        name: 'x',
        config: JSON.stringify({}),
      });
      this.xAuthMethod = await this.authMethodRepository.save(xMethod);
    } else {
      this.xAuthMethod = xMethod;
    }
    this.logger.debug('Seeded AuthMethod: x');
  }

  /**
   * Links an X account to an already existing User.
   *
   * @param userId - Existing application User ID
   * @param x_id - X User ID (string from X API)
   * @param username - X username
   * @param name - X display name
   * @param join_date - Account creation date
   * @param expiresTime - Token expiration in seconds
   * @param access_token - X OAuth2 access token
   * @param refresh_token - X OAuth2 refresh token
   * @returns Promise<void>
   */
  public linkXAccount = async (
    userId: number,
    x_id: string,
    username: string,
    name: string,
    join_date: Date,
    expiresTime: number,
    access_token: string,
    refresh_token: string,
  ): Promise<void> => {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error(`User with ID ${userId} not found`);

    if (user.x_id != null && user.x_id !== x_id) {
      throw new Error(`User ${userId} already linked a different X account`);
    }

    const existingUserWithX = await this.userRepository.findOne({
      where: { x_id: x_id, id: Not(userId) },
    });

    if (existingUserWithX) {
      throw new Error(
        `This X account is already linked with another user (${existingUserWithX.id})`,
      );
    }

    user.x_id = x_id;
    user.name = user.name ?? name ?? undefined;
    user.metadata = {
      ...user.metadata,
      x: {
        username,
        name: name ?? undefined,
        join_date: join_date,
      },
    };

    const savedUser = await this.userRepository.save(user);
    this.logger.debug(`Linked X ID ${x_id} to user ID ${userId}`);

    const expireAt = new Date(Date.now() + expiresTime * 1000);

    await this.saveOrUpdateXAuthStatus(
      savedUser,
      expireAt,
      access_token,
      refresh_token,
    );
  };

  /**
   * Creates or updates the `UserAuthStatus` record for a user's X authentication.
   *
   * @param user - User entity already saved in DB
   * @param expiresAt - Token expiration date
   * @param accessToken - X OAuth2 access token
   * @param refreshToken - X OAuth2 refresh token
   * @returns Promise<void>
   */
  private saveOrUpdateXAuthStatus = async (
    user: User,
    expiresAt: Date,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> => {
    let authStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user: { id: user.id },
        authMethod: { id: this.xAuthMethod.id },
      },
      relations: ['authMethod', 'user'],
    });

    if (!authStatus) {
      authStatus = this.userAuthStatusRepository.create({
        user,
        authMethod: this.xAuthMethod,
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
    this.logger.debug(`Saved/Updated X UserAuthStatus for user ID ${user.id}`);
  };
}

export { XAction };
