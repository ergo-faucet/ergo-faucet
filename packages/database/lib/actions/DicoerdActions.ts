import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';
import { User, UserAuthStatus, AuthMethod } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class DiscordAction {
  private static instance: DiscordAction;

  private logger: AbstractLogger;
  private userRepository: Repository<User>;
  private userAuthStatusRepository: Repository<UserAuthStatus>;
  private authMethodRepository: Repository<AuthMethod>;

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
   * Initializes the DiscordAction singleton instance.
   *
   * @param dataSource - TypeORM DataSource for database operations
   * @param logger - Optional logger instance
   * @throws Error if already initialized
   */
  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) throw new Error('DiscordAction already initialized');
    this.instance = new DiscordAction(dataSource, logger);
  };

  /**
   * Returns the singleton instance after initialization.
   * @returns DiscordAction instance
   * @throws Error if not initialized
   */
  public static getInstance = (): DiscordAction => {
    if (!this.instance) throw new Error('DiscordAction not initialized');
    return this.instance;
  };

  /**
   * Ensures the `discord` AuthMethod is seeded in the database.
   *
   * - Checks if an AuthMethod with name `discord` exists.
   * - If missing, creates it with an empty config.
   *
   * @returns Promise<void>
   */
  public async ensureDiscordAuthMethod(): Promise<void> {
    let discordMethod = await this.authMethodRepository.findOne({
      where: { name: 'discord' },
    });
    if (!discordMethod) {
      discordMethod = this.authMethodRepository.create({
        name: 'discord',
        config: JSON.stringify({}),
      });
      await this.authMethodRepository.save(discordMethod);
    }
    this.logger.debug('Seeded AuthMethod: discord');
  }

  /**
   * Links a Discord account to an already existing User.
   *
   *
   * @param userId - Existing application User ID
   * @param discord_id - Discord User ID (string from Discord API)
   * @param username - Discord username
   * @param global_name - Discord global name (nullable)
   * @param email - User email from Discord (nullable)
   * @param first_join - Calculated first join timestamp
   * @param access_token - Discord OAuth2 access token
   * @param refresh_token - Discord OAuth2 refresh token
   * @returns Promise<void>
   */
  public linkDiscordAccount = async (
    userId: number,
    discord_id: string,
    username: string,
    global_name: string | null,
    email: string | null,
    first_join: Date,
    expiresAt: Date,
    access_token: string,
    refresh_token: string,
  ): Promise<void> => {
    const discordIdNum = Number(discord_id);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error(`User with ID ${userId} not found`);
    if (user.discord_id != null)
      throw new Error(`User with ID ${user.id} is already logged in discord`);

    user.discord_id = discordIdNum;
    user.name = user.name ?? global_name ?? undefined;
    user.metadata = {
      ...user.metadata,
      discord: {
        username: username,
        name: global_name ?? undefined,
        email: email ?? undefined,
        first_join: first_join,
      },
    };

    const savedUser = await this.userRepository.save(user);
    this.logger.debug(`Linked Discord ID ${discordIdNum} to user ID ${userId}`);

    await this.saveOrUpdateDiscordAuthStatus(
      savedUser,
      expiresAt,
      access_token,
      refresh_token,
    );
  };

  /**
   * Creates or updates the `UserAuthStatus` record for a user's Discord authentication.
   *
   * @param user - User entity already saved in DB
   * @param accessToken - Discord OAuth2 access token
   * @param refreshToken - Discord OAuth2 refresh token
   * @returns Promise<void>
   */
  private saveOrUpdateDiscordAuthStatus = async (
    user: User,
    expiresAt: Date,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> => {
    const discordAuthMethod = await this.authMethodRepository.findOne({
      where: { name: 'discord' },
    });

    if (!discordAuthMethod) {
      throw new Error("There isn't any Auth method for discord in database");
    } else {
      let authStatus = await this.userAuthStatusRepository.findOne({
        where: {
          user: { id: user.id },
          authMethod: { id: discordAuthMethod.id },
        },
        relations: ['authMethod', 'user'],
      });

      if (!authStatus) {
        authStatus = this.userAuthStatusRepository.create({
          user,
          authMethod: discordAuthMethod,
          verifiedAt: new Date(),
          status: 'passed',
          expiresAt,
          metadata: {
            discord: {
              token: accessToken,
              refresh_token: refreshToken,
            },
          },
        });
      } else {
        authStatus.verifiedAt = new Date();
        authStatus.status = 'passed';
        authStatus.expiresAt = expiresAt;
        authStatus.metadata = {
          discord: {
            token: accessToken,
            refresh_token: refreshToken,
          },
        };
      }

      await this.userAuthStatusRepository.save(authStatus);
      this.logger.debug(
        `Saved/Updated Discord UserAuthStatus for user ID ${user.id}`,
      );
    }
  };
}

export { DiscordAction };
