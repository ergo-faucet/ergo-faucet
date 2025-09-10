import { DataSource, Not } from '@rosen-bridge/extended-typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractAuthAction } from './AbstractAuthAction';

class XAction extends AbstractAuthAction {
  private static instance: XAction;

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
    this.instance.ensureAuthMethod();
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
   * Returns the name of the authentication method
   * @returns Authentication method name as a string
   */
  protected getAuthMethodName = (): string => {
    return 'x-platform';
  };

  /**
   * Links an X-platform account to an already existing User.
   *
   * @param userId - Existing application User ID
   * @param x_id - X-platform User ID (string from X-platform API)
   * @param username - X-platform username
   * @param name - X-platform display name
   * @param join_date - Account creation date
   * @param expiresTime - Token expiration in seconds
   * @param access_token - X-platform OAuth2 access token
   * @param refresh_token - X-platform OAuth2 refresh token
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
      throw new Error(
        `User ${userId} already linked a different X-platform account`,
      );
    }

    const existingUserWithX = await this.userRepository.findOne({
      where: { x_id: x_id, id: Not(userId) },
    });

    if (existingUserWithX) {
      throw new Error(
        `This X-platform account is already linked with another user (${existingUserWithX.id})`,
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
    this.logger.debug(`Linked X-platform ID ${x_id} to user ID ${userId}`);

    const expiresAt = new Date(Date.now() + expiresTime * 1000);
    await this.saveOrUpdateAuthStatus(
      savedUser,
      expiresAt,
      access_token,
      refresh_token,
    );
  };
}

export { XAction };
