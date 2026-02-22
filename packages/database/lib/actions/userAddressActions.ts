import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { DataSource, In, Repository } from '@rosen-bridge/extended-typeorm';

import { User, UserAddress } from '../entities';
import { UnexpectedError } from '../types';

class UserAddressAction {
  private static instance: UserAddressAction;

  private logger: AbstractLogger;
  private dataSource: DataSource;
  private UserAddressRepository: Repository<UserAddress>;
  private UserRepository: Repository<User>;

  /**
   * Private constructor to enforce singleton pattern.
   * @param dataSource
   * @param logger - Logger for the class to log. A DummyLogger by default
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.dataSource = dataSource;
    this.UserAddressRepository = dataSource.getRepository(UserAddress);
    this.UserRepository = dataSource.getRepository(User);
  }

  /**
   * Initialize singleton with data source
   * @param dataSource - TypeORM DataSource for database operations
   * @param logger - The logger of the class
   */
  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error(
        'UserAddressAction instance has already been initialized.',
      );
    }

    UserAddressAction.instance = new UserAddressAction(dataSource, logger);
  };

  /**
  /**
   * Gets the singleton instance of UserAddressAction.
   * @returns The singleton instance of UserAddressAction
   * @throws {Error} If the instance has not been initialized
   */
  public static getInstance = (): UserAddressAction => {
    if (!this.instance) {
      throw new Error('UserAddressAction instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Finds and returns User entities associated with the given addresses.
   * @param addresses - List of Ergo addresses
   * @returns Array of User entities (empty if none found)
   */
  getUsersByAddresses = async (addresses: string[]): Promise<UserAddress[]> => {
    this.logger.debug(
      `Looking for users by addresses: ${addresses.join(', ')}`,
    );

    const userAddresses = await this.UserAddressRepository.find({
      where: { value: In(addresses) },
      relations: ['user'],
    });

    this.logger.debug(`Found ${userAddresses.length} user-address matches`);

    return userAddresses;
  };

  /**
   * Finds a user by address or creates a new user and links the address.
   * Also updates `lastLogin` to the current time for existing or new users.
   * @param address - Ergo root address to find or associate with user
   * @returns The existing or newly created User entity
   */
  findOrCreateUserWithAddress = async (address: string): Promise<User> => {
    this.logger.debug(`Finding or creating user for address: ${address}`);
    let user: User | undefined;
    const now = Math.floor(Date.now() / 1000);

    const users = await this.getUsersByAddresses([address]);
    if (users.length > 1) {
      this.logger.debug(`Multiple users found for address: ${address}`);
      throw new UnexpectedError(
        `Unbehavior: Multiple users found for address ${address}`,
      );
    } else if (users.length === 1) {
      this.logger.debug(`User found for address: ${address}`);
      user = users[0].user;
    } else {
      this.logger.debug(
        `No user found for address: ${address}, creating new user.`,
      );
    }

    if (user) {
      user.lastLogin = now;
      user.modifiedAt = now;
      await this.UserRepository.save(user);
      this.logger.debug(`Updated lastLogin for user ID ${user.id} at ${now}`);
      return user;
    }

    return await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const userRepoTx = transactionalEntityManager.getRepository(User);
        const userAddressRepoTx =
          transactionalEntityManager.getRepository(UserAddress);

        const newUser = userRepoTx.create({
          lastLogin: now,
          createdAt: now,
          modifiedAt: now,
        });
        const savedUser = await userRepoTx.save(newUser);

        const userAddress = userAddressRepoTx.create({
          user: savedUser,
          value: address,
          createdAt: now,
          modifiedAt: now,
        });
        await userAddressRepoTx.save(userAddress);

        this.logger.debug(
          `Created new user ID ${savedUser.id} and linked address ${address}`,
        );

        return savedUser;
      },
    );
  };
}

export { UserAddressAction };
