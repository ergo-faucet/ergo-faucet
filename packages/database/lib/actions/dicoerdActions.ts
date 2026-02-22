import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource, Not } from '@rosen-bridge/extended-typeorm';

import { AbstractAuthAction } from './abstractAuthAction';

class DiscordAction extends AbstractAuthAction {
  private static instance: DiscordAction;
  readonly authMethodName = 'discord';

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
   * Initializes the DiscordAction singleton instance.
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
      throw new Error('DiscordAction instance has already been initialized.');
    this.instance = new DiscordAction(dataSource, logger);
    await this.instance.ensureAuthMethod();
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
    user.modifiedAt = Math.floor(Date.now() / 1000);
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

    const expiresAt = Math.floor(Date.now() / 1000) + expiresTime;

    await this.saveOrUpdateAuthStatus(
      savedUser,
      expiresAt,
      access_token,
      refresh_token,
    );
  };
}

export { DiscordAction };
