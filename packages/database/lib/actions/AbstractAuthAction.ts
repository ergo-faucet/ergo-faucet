import {
  DataSource,
  LessThanOrEqual,
  Repository,
} from '@rosen-bridge/extended-typeorm';
import { User, UserAuthStatus, AuthMethod } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

abstract class AbstractAuthAction {
  protected logger: AbstractLogger;
  protected userRepository: Repository<User>;
  protected userAuthStatusRepository: Repository<UserAuthStatus>;
  protected authMethodRepository: Repository<AuthMethod>;
  protected authMethod!: AuthMethod;
  abstract readonly authMethodName: string;

  /**
   * Constructor for AbstractAuthAction class
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
   * Ensures the AuthMethod is seeded in the database.
   * - Checks if an AuthMethod exists.
   * - If missing, creates it with an empty config.
   * @returns Promise<void>
   */
  protected ensureAuthMethod = async (): Promise<void> => {
    let method = await this.authMethodRepository.findOne({
      where: { name: this.authMethodName },
    });

    if (!method) {
      method = this.authMethodRepository.create({
        name: this.authMethodName,
        config: JSON.stringify({}),
        createdAt: Math.floor(Date.now() / 1000),
        modifiedAt: Math.floor(Date.now() / 1000),
      });
      this.authMethod = await this.authMethodRepository.save(method);
    } else {
      this.authMethod = method;
    }

    this.logger.debug(`Seeded AuthMethod: ${this.authMethodName}`);
  };

  /**
   * Creates or updates the `UserAuthStatus` record for a user's auth authentication.
   * @param user - User entity already saved in DB
   * @param expiresAt Token expiration
   * @param accessToken - OAuth2 access token
   * @param refreshToken - OAuth2 refresh token
   * @returns Promise<void>
   */
  protected saveOrUpdateAuthStatus = async (
    user: User,
    expiresAt: number,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> => {
    let authStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user: { id: user.id },
        authMethod: { id: this.authMethod.id },
      },
      relations: ['authMethod', 'user'],
    });
    if (!authStatus) {
      authStatus = this.userAuthStatusRepository.create({
        user,
        authMethod: this.authMethod,
        verifiedAt: Math.floor(Date.now() / 1000),
        status: 'passed',
        expiresAt,
        metadata: {
          token: accessToken,
          refresh_token: refreshToken,
        },
        createdAt: Math.floor(Date.now() / 1000),
        modifiedAt: Math.floor(Date.now() / 1000),
      });
    } else {
      authStatus.verifiedAt = Math.floor(Date.now() / 1000);
      authStatus.status = 'passed';
      authStatus.expiresAt = expiresAt;
      authStatus.metadata = {
        token: accessToken,
        refresh_token: refreshToken,
      };
      authStatus.modifiedAt = Math.floor(Date.now() / 1000);
    }

    await this.userAuthStatusRepository.save(authStatus);
    this.logger.debug(
      `Saved/Updated ${this.authMethodName} UserAuthStatus for user ID ${user.id}`,
    );
  };

  /**
   * Marks a user's authentication as expired.
   * Updates UserAuthStatus record and logs the expiration.
   *
   * @param userAuthStatus User authentication status record
   */
  public expireAuth = async (userAuthStatus: UserAuthStatus): Promise<void> => {
    userAuthStatus.status = 'expired';
    userAuthStatus.metadata.refresh_token = '';
    userAuthStatus.metadata.token = '';
    userAuthStatus.modifiedAt = Math.floor(Date.now() / 1000);
    await this.userAuthStatusRepository.save(userAuthStatus);

    this.logger.debug(
      `Expired ${this.authMethodName} auth for user ID ${userAuthStatus.user.id}`,
    );
  };

  /**
   * Expires all authentication records of this method
   * that are past their expiry time.
   */
  public expireAllExpiredAuths = async (): Promise<void> => {
    const now = Math.floor(Date.now() / 1000);
    const expiredRecords: UserAuthStatus[] =
      await this.userAuthStatusRepository.find({
        where: {
          authMethod: { id: this.authMethod.id },
          expiresAt: LessThanOrEqual(now),
          status: 'passed',
        },
        relations: ['user', 'authMethod'],
      });

    for (const record of expiredRecords) {
      await this.expireAuth(record);
    }

    this.logger.debug(
      `Processed ${expiredRecords.length} expired ${this.authMethodName} auth records`,
    );
  };
}

export { AbstractAuthAction };
