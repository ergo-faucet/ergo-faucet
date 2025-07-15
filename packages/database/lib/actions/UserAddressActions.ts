import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';
import { User, UserAddress } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class UserAddressAction {
  private static instance: UserAddressAction;

  private logger: AbstractLogger;
  private UserAddressReposotory: Repository<UserAddress>;
  private UserRepository: Repository<User>;

  /**
   * Private constructor to enforce singleton pattern.
   * @param dataSource
   * @param logger - Logger for the class to log. A DummyLogger by default
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.UserAddressReposotory = dataSource.getRepository(UserAddress);
    this.UserRepository = dataSource.getRepository(User);
  }

  /**
   * Initialize singleton with data source
   * @param dataSource
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
   * Creates and stores a new UserAddress entity linked to a specific user.
   * @param user - User entity or user ID to associate the address with
   * @param address - Ergo blockchain address to store
   * @returns The created UserAddress entity
   */
  createUserAddress = async (
    user: User,
    address: string,
  ): Promise<UserAddress> => {
    const userAddress = this.UserAddressReposotory.create({
      user: user,
      value: address,
    });

    const saved = await this.UserAddressReposotory.save(userAddress);
    this.logger.debug(`New address [${address}] linked to user ID ${user.id}`);

    return saved;
  };

  /**
   * Finds and returns the User entity associated with the given address.
   * @param address - Ergo address to search for
   * @returns The User entity or undefind if not found
   */
  getUserByAddress = async (address: string): Promise<User | undefined> => {
    this.logger.debug(`Looking for user by address: ${address}`);

    const userAddress = await this.UserAddressReposotory.findOne({
      where: { value: address },
      relations: ['user'],
    });

    if (userAddress?.user) {
      this.logger.debug(
        `User ID ${userAddress.user.id} found for address: ${address}`,
      );
    } else {
      this.logger.debug(`No user found for address: ${address}`);
    }

    return userAddress?.user;
  };

  /**
   * Finds a user by address or creates a new user and links the address.
   * Also updates `lastLogin` to the current time for existing or new users.
   * @param address - Ergo root address to find or associate with user
   * @returns The existing or newly created User entity
   */
  findOrCreateUserWithAddress = async (address: string): Promise<User> => {
    this.logger.debug(`Finding or creating user for address: ${address}`);

    const user = await this.getUserByAddress(address);
    const now = Date.now();

    if (user) {
      user.lastLogin = now;
      await this.UserRepository.save(user);
      this.logger.debug(`Updated lastLogin for user ID ${user.id} at ${now}`);
      return user;
    }

    const newUser = this.UserRepository.create({
      lastLogin: now,
    });
    const savedUser = await this.UserRepository.save(newUser);

    await this.createUserAddress(savedUser, address);
    this.logger.debug(
      `Created new user ID ${savedUser.id} with address: ${address} at ${now}`,
    );

    return savedUser;
  };
}

export { UserAddressAction };
