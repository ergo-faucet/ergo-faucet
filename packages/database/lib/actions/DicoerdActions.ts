import {
  DataSource,
  LessThan,
  Not,
  Repository,
} from '@rosen-bridge/extended-typeorm';
import { User, UserAuthStatus, AuthMethod } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class DiscordAction {
  private static instance: DiscordAction;

  private logger: AbstractLogger;
  private userRepository: Repository<User>;
  private userAuthStatusRepository: Repository<UserAuthStatus>;
  private authMethodRepository: Repository<AuthMethod>;
  private discordAuthMethod!: AuthMethod;

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
    if (this.instance)
      throw new Error('DiscordAction instance has already been initialized.');
    this.instance = new DiscordAction(dataSource, logger);
  };

  /**
   * Returns the singleton instance after initialization.
   * @returns DiscordAction instance
   * @throws Error if not initialized
   */
  public static getInstance = (): DiscordAction => {
    if (!this.instance)
      throw new Error('DiscordAction instance has not been initialized.');
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
      this.discordAuthMethod =
        await this.authMethodRepository.save(discordMethod);
    } else {
      this.discordAuthMethod = discordMethod;
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
   * @param join_date - Calculated first join timestamp
   * @param expiresTime - Token expiration in seconds
   * @param access_token - Discord OAuth2 access token
   * @param refresh_token - Discord OAuth2 refresh token
   * @returns Promise<void>
   */
  public linkDiscordAccount = async (
    userId: number,
    discord_id: string,
    username: string,
    join_date: Date,
    expiresTime: number,
    access_token: string,
    refresh_token: string,
    email?: string,
    global_name?: string,
  ): Promise<void> => {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error(`User with ID ${userId} not found`);

    if (user.discord_id != null && user.discord_id !== discord_id) {
      throw new Error(
        `User ${userId} already linked a different Discord account`,
      );
    }

    const existingUserWithDiscord = await this.userRepository.findOne({
      where: { discord_id: discord_id, id: Not(userId) },
    });

    if (existingUserWithDiscord) {
      throw new Error(
        `This Discord account is already linked with another user (${existingUserWithDiscord.id})`,
      );
    }

    user.discord_id = discord_id;
    user.name = user.name ?? global_name ?? undefined;
    user.metadata = {
      ...user.metadata,
      discord: {
        username,
        name: global_name ?? undefined,
        email: email ?? undefined,
        join_date: join_date,
      },
    };

    const savedUser = await this.userRepository.save(user);
    this.logger.debug(`Linked Discord ID ${discord_id} to user ID ${userId}`);

    const expiresAt = new Date(Date.now() + expiresTime * 1000);

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
    let authStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user: { id: user.id },
        authMethod: { id: this.discordAuthMethod.id },
      },
      relations: ['authMethod', 'user'],
    });

    if (!authStatus) {
      authStatus = this.userAuthStatusRepository.create({
        user,
        authMethod: this.discordAuthMethod,
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
      `Saved/Updated Discord UserAuthStatus for user ID ${user.id}`,
    );
  };

  /**
   * Marks a user's Discord authentication as expired.
   * Updates UserAuthStatus record and logs the expiration.
   *
   * @param userAuthStatust
   */
  public expireDiscordAuth = async (
    userAuthStatust: UserAuthStatus,
  ): Promise<void> => {
    userAuthStatust.status = 'failed';
    userAuthStatust.metadata.refresh_token = '';
    userAuthStatust.metadata.token = '';
    await this.userAuthStatusRepository.save(userAuthStatust);

    this.logger.info(
      `Expired Discord auth for user ID ${userAuthStatust.user.id}`,
    );
  };

  /**
   * Expires all Discord auth records that are past their expiry.
   */
  public expireAllExpiredDiscordAuths = async (): Promise<void> => {
    const now = new Date();
    const expiredRecords: UserAuthStatus[] =
      await this.userAuthStatusRepository.find({
        where: {
          authMethod: { id: this.discordAuthMethod.id },
          expiresAt: LessThan(now),
          status: 'passed',
        },
        relations: ['user', 'authMethod'],
      });

    for (const record of expiredRecords) {
      await this.expireDiscordAuth(record);
    }

    this.logger.info(
      `Processed ${expiredRecords.length} expired Discord auth records`,
    );
  };
}

export { DiscordAction };
