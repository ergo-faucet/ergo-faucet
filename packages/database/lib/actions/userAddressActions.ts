import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';
import { UserAddress } from '../entities/UserAddress';
import { User } from '../entities/User';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

const logger = new DummyLogger();

class UserAddressAction {
  private static instance: UserAddressAction | undefined = undefined;

  private dataSource: DataSource;
  private userAddressRepo: Repository<UserAddress>;
  private userRepo: Repository<User>;

  protected constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.userAddressRepo = this.dataSource.getRepository(UserAddress);
    this.userRepo = this.dataSource.getRepository(User);
  }

  /**
   * Initialize singleton with data source
   * @param dataSource
   */
  public static init(dataSource: DataSource): UserAddressAction {
    if (!UserAddressAction.instance) {
      logger.debug('UserAddressAction instance not found, creating new one');
      UserAddressAction.instance = new UserAddressAction(dataSource);
    }
    return UserAddressAction.instance;
  }

  /**
   * Get singleton instance
   * @throws if not initialized
   */
  public static getInstance(): UserAddressAction {
    if (!UserAddressAction.instance)
      throw new Error('UserAddressAction is not initialized');
    return UserAddressAction.instance;
  }

  /**
   * Create a new UserAddress linked to a User
   */
  public async createUserAddress(
    user: User | number,
    address: string,
  ): Promise<UserAddress> {
    const userEntity =
      typeof user === 'number'
        ? await this.userRepo.findOneBy({ id: user })
        : user;
    if (!userEntity) throw new Error('User not found');

    const userAddress = this.userAddressRepo.create({
      user: userEntity,
      value: address,
    });

    return await this.userAddressRepo.save(userAddress);
  }

  /**
   * Find user by address string
   */
  public async getUserByAddress(address: string): Promise<User | null> {
    const userAddress = await this.userAddressRepo.findOne({
      where: { value: address },
      relations: ['user'],
    });
    return userAddress?.user ?? null;
  }

  /**
   * Get all UserAddresses optionally including user
   */
  public async getAllUserAddresses(
    includeUser = false,
  ): Promise<UserAddress[]> {
    return await this.userAddressRepo.find({
      relations: includeUser ? ['user'] : [],
    });
  }
}

export { UserAddressAction };
