import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';
import { UserAddress } from '../entities/UserAddress';
import { User } from '../entities/User';

class UserAddressAction {
  private static instance: UserAddressAction;

  private dataSource: DataSource;
  private UserAddressReposotory: Repository<UserAddress>;
  private UserRepository: Repository<User>;

  protected constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.UserAddressReposotory = this.dataSource.getRepository(UserAddress);
    this.UserRepository = this.dataSource.getRepository(User);
  }

  /**
   * Initialize singleton with data source
   * @param dataSource
   */
  static init = (dataSource: DataSource): UserAddressAction => {
    if (!UserAddressAction.instance) {
      UserAddressAction.instance = new UserAddressAction(dataSource);
    }
    return UserAddressAction.instance;
  };

  /**
   * gets instance of UserAddressAction (throws error if it doesn't exist)
   * @returns UserAddressAction instance
   */
  static getInstance = (): UserAddressAction => {
    if (!UserAddressAction.instance)
      throw new Error('UserAddressAction is not initialized');
    return UserAddressAction.instance;
  };

  /**
   * Creates and stores a new UserAddress entity linked to a specific user.
   * @param user - User entity or user ID to associate the address with
   * @param address - Ergo blockchain address to store
   * @returns The created UserAddress entity
   * @throws If the user is not found when passing user ID
   */
  createUserAddress = async (
    user: User | number,
    address: string,
  ): Promise<UserAddress> => {
    const userEntity =
      typeof user === 'number'
        ? await this.UserRepository.findOneBy({ id: user })
        : user;
    if (!userEntity) throw new Error('User not found');

    const userAddress = this.UserAddressReposotory.create({
      user: userEntity,
      value: address,
    });

    return await this.UserAddressReposotory.save(userAddress);
  };

  /**
   * Finds and returns the User entity associated with the given address.
   * @param address - Ergo address to search for
   * @returns The User entity or null if not found
   */
  getUserByAddress = async (address: string): Promise<User | null> => {
    const userAddress = await this.UserAddressReposotory.findOne({
      where: { value: address },
      relations: ['user'],
    });
    return userAddress?.user ?? null;
  };

  /**
   * Returns all UserAddress records, optionally including their associated users.
   * @param includeUser - Whether to include user relations (default: false)
   * @returns An array of UserAddress entities
   */
  getAllUserAddresses = async (includeUser = false): Promise<UserAddress[]> => {
    return await this.UserAddressReposotory.find({
      relations: includeUser ? ['user'] : [],
    });
  };

  /**
   * Finds a user by address or creates a new user and links the address.
   * Also updates `lastLogin` to the current time for existing or new users.
   * @param address - Ergo root address to find or associate with user
   * @returns The existing or newly created User entity
   */
  findOrCreateUserWithAddress = async (address: string): Promise<User> => {
    const user = await this.getUserByAddress(address);
    const now = new Date();

    if (user) {
      user.lastLogin = now;
      await this.UserRepository.save(user);
      return user;
    }

    const newUser = this.UserRepository.create({
      lastLogin: now,
    });
    const savedUser = await this.UserRepository.save(newUser);

    await this.createUserAddress(savedUser, address);

    return savedUser;
  };
}

export { UserAddressAction };
