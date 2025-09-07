import {
  DataSource,
  Equal,
  FindOptionsOrder,
  In,
  IsNull,
  Not,
  Repository,
} from '@rosen-bridge/extended-typeorm';
import {
  Package,
  PackageAuthMethod,
  UserAuthStatus,
  UserRequest,
  User,
  Asset,
  AuthMethod,
} from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { NotFoundError, PackageToAdd, RequestLimitError } from '../types';

class PackageAction {
  private static instance: PackageAction;

  private logger: AbstractLogger;
  private dataSource: DataSource;
  private packageRepository: Repository<Package>;
  private packageAuthMethodRepository: Repository<PackageAuthMethod>;
  private userAuthStatusRepository: Repository<UserAuthStatus>;
  private userRequestRepository: Repository<UserRequest>;
  private assetRepository: Repository<Asset>;
  private userRepository: Repository<User>;
  private authMethodRepository: Repository<AuthMethod>;

  /**
   * Protected constructor to enforce singleton pattern.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.dataSource = dataSource;

    this.packageRepository = this.dataSource.getRepository(Package);
    this.packageAuthMethodRepository =
      this.dataSource.getRepository(PackageAuthMethod);
    this.userAuthStatusRepository =
      this.dataSource.getRepository(UserAuthStatus);
    this.userRequestRepository = this.dataSource.getRepository(UserRequest);

    this.userRepository = this.dataSource.getRepository(User);
    this.assetRepository = this.dataSource.getRepository(Asset);
    this.authMethodRepository = this.dataSource.getRepository(AuthMethod);
  }

  /**
   * Initializes the PackageAction singleton with the given DataSource and optional logger.
   * Throws an error if already initialized.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error('PackageAction instance has already been initialized.');
    }

    PackageAction.instance = new PackageAction(dataSource, logger);
  };

  /**
   * Returns the singleton instance of PackageAction.
   * Throws an error if not yet initialized.
   * @returns {PackageAction} The singleton instance.
   */
  public static getInstance = (): PackageAction => {
    if (!this.instance) {
      throw new Error('PackageAction instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Fetches packages from the database with pagination and sorting.
   * Only packages with status 'show' are returned.
   *
   * @param offset - The number of records to skip.
   * @param limit - The maximum number of records to return.
   * @param sort - The field to sort by ('name' or 'release').
   * @param order - The sort order ('asc' or 'desc').
   * @returns {Promise<Package[]>} A promise that resolves to an array of Package entities.
   */
  public getPackages = async (
    offset: number,
    limit: number,
    sort: 'id' | 'openAt' | 'closeAt' | 'name',
    order: 'asc' | 'desc',
  ): Promise<Package[]> => {
    this.logger.debug(
      `Fetching packages from database offset:${offset}, limit:${limit}, sort:${sort}, order:${order}`,
    );

    const orderOption: FindOptionsOrder<Package> = { [sort]: order };

    // Query the database for packages with status 'show'
    const packages = await this.packageRepository.find({
      where: { status: 'show' },
      order: orderOption,
      skip: offset,
      take: limit,
      relations: ['assets', 'authMethods', 'authMethods.authMethod'],
    });
    return packages;
  };

  /**
   * Checks if a package is available for a given user.
   *
   * - Verifies that the package exists and is visible.
   * - Verifies that the user exists.
   * - Checks cooldown period based on the user's last request for the package.
   *
   * @param packageId - Package ID to check
   * @param userId - User ID to check
   * @returns {Promise<boolean>} - True if available, otherwise throws
   * @throws {NotFoundError} if package or user does not exist
   * @throws {RequestLimitError} if cooldown period is still active
   */
  public isPackageAvailableForUser = async (
    userId: number,
    packageId: number,
  ): Promise<boolean> => {
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId, status: 'show' },
    });
    if (!pkg)
      throw new NotFoundError(
        `There is no package with id ${packageId} available`,
      );

    const usr = await this.userRepository.find({
      where: { id: userId },
    });
    if (!usr) throw new NotFoundError(`There is no user with id ${userId}`);

    const userRequests = await this.userRequestRepository.find({
      where: {
        package: { id: packageId },
        user: { id: userId },
        status: Not(Equal('failed')),
      },
      order: { id: 'DESC' }, // checking the latest request
    });
    const requestsCount = userRequests.length;

    if (userRequests) {
      const latestRequest = userRequests[0];
      const currentTime = new Date();
      const lastRequestTime = latestRequest.timestamp;
      const timeDifferenceMs =
        currentTime.getTime() - lastRequestTime.getTime();

      if (timeDifferenceMs < pkg.delay)
        throw new RequestLimitError('Cooldown period is still active.');
    }

    if (requestsCount + 1 > pkg.numberEachUser) {
      throw new RequestLimitError(
        'User has reached request limit for this package.',
      );
    }
    return true;
  };

  /**
   * Checks if the user has passed all required authentication methods for a package.
   *
   * - Fetches required AuthMethods for the package.
   * - Checks if user has passed all required AuthMethods.
   *
   * @param userId - User ID to check
   * @param packageId - Package ID to check
   * @returns {Promise<boolean>} - True if all required methods are passed
   * @throws `Error` if database query fails
   */
  public hasUserPassedAllAuthMethods = async (
    userId: number,
    packageId: number,
  ): Promise<boolean> => {
    const requiredAuthMethods = await this.packageAuthMethodRepository.find({
      where: { package: { id: packageId } },
      relations: ['authMethod'],
    });

    if (requiredAuthMethods.length === 0) {
      this.logger.debug(
        `No auth methods required for packageId=${packageId}, userId=${userId}`,
      );
      return true; //package has no auth method then we do not need to check user auth status
    }

    const requiredAuthMethodIds = new Set(
      requiredAuthMethods.map((pam) => pam.authMethod.id),
    );
    const passedAuthMethodIds = new Set(
      await this.getPassedUserAuthByPackage(userId, packageId),
    );

    // Check if all required auth methods are in the passed set
    return [...requiredAuthMethodIds].every((id) =>
      passedAuthMethodIds.has(id),
    );
  };

  /**
   * Retrieves IDs of all passed UserAuthStatus records for a user and package.
   *
   * @param userId - User ID
   * @param packageId - Package ID
   * @returns {Promise<number[]>} - Array of passed AuthMethod IDs
   * @throws Error if database query fails
   */
  public getPassedUserAuthByPackage = async (
    userId: number,
    packageId: number,
  ): Promise<number[]> => {
    const passedAuthStatuses = await this.userAuthStatusRepository.find({
      where: [
        {
          user: { id: userId },
          package: { id: packageId },
          status: 'passed',
        },
        {
          user: { id: userId },
          package: IsNull(), //since package is optional we need to get those entries with null in package field
          status: 'passed',
        },
      ],
      relations: ['authMethod'],
    });

    this.logger.debug(
      `Fetched ${passedAuthStatuses.length} passed UserAuthStatus for userId=${userId}, packageId=${packageId}`,
    );
    return passedAuthStatuses.map((uas) => uas.authMethod.id);
  };

  /**
   * Adds a new user request for a package.
   *
   * @param userId - User ID making the request
   * @param packageId - Package ID requested
   * @param destAddress - Destination address for the request
   * @returns {Promise<void>}
   * @throws `Error` if database save fails
   */
  public addUserRequest = async (
    userId: number,
    packageId: number,
    destAddress: string,
  ): Promise<number> => {
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId },
    });
    const usr = await this.userRepository.findOne({
      where: { id: userId },
    });

    const userRequest = this.userRequestRepository.create({
      destinationAddress: destAddress,
      package: pkg!,
      status: 'pending',
      user: usr!,
      timestamp: new Date(),
    });

    await this.userRequestRepository.save(userRequest);
    this.logger.debug(
      `Added UserRequest for user ID ${userId} and package ID ${packageId} to the database`,
    );
    return userRequest.id;
  };

  public addPackage = async (packageData: PackageToAdd): Promise<number> => {
    this.logger.debug(
      `Adding new package with data: ${JSON.stringify(
        packageData,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      )}`,
    );

    // Create a new Package entity
    const newPackage = this.packageRepository.create({
      name: packageData.name,
      description: packageData.description,
      type: packageData.type,
      status: packageData.status,
      openAt: packageData.openAt ? new Date(packageData.openAt) : undefined,
      closeAt: packageData.closeAt ? new Date(packageData.closeAt) : undefined,
      delay: packageData.delay,
      numberEachUser: packageData.numberEachUser,
    });

    // Save the package to the database
    const savedPackage = await this.packageRepository.save(newPackage);
    this.logger.debug(`New package saved with ID ${savedPackage.id}`);

    await this.addAssets(packageData.assets, savedPackage);
    await this.addPackageAuthMethods(packageData.authMethods, savedPackage);

    return savedPackage.id;
  };

  public addAssets = async (
    assets: {
      tokenId: string;
      amount: bigint;
      decimals: number;
      usageDescription: string;
    }[],
    pkg: Package,
  ) => {
    // Create Asset entities
    const newAssets = this.assetRepository.create(
      assets.map((asset) => ({
        tokenId: asset.tokenId,
        amount: asset.amount,
        decimals: asset.decimals,
        usageDescription: asset.usageDescription,
        package: pkg, // Associate with the saved package
      })),
    );
    // Save given assets to the database
    await this.assetRepository.save(newAssets);
    this.logger.debug(`Assets for package ID ${pkg.id} saved successfully`);
  };

  public addPackageAuthMethods = async (
    authMethods: { id: number; order?: number }[],
    pkg: Package,
  ) => {
    // Create PackageAuthMethod entities
    const packageAuthMethods: PackageAuthMethod[] = [];

    for (let i = 0; i < authMethods.length; i++) {
      const authMethod = await this.authMethodRepository.findOne({
        where: { id: authMethods[i].id },
      });

      if (!authMethod)
        throw new NotFoundError(
          `Auth method with id ${authMethods[i]} not found`,
        );

      const pam = this.packageAuthMethodRepository.create({
        authMethod,
        package: pkg,
        order: authMethods[i].order,
      });

      packageAuthMethods.push(pam);
    }

    // Save PackageAuthMethod entities to the database
    await this.packageAuthMethodRepository.save(packageAuthMethods);
  };

  /**
   * Checks if the specified user is an admin.
   * @param userId - The ID of the user to validate.
   * @returns {Promise<boolean>} True if the user is an admin, otherwise false.
   */
  public validateAdminRequest = async (userId: number): Promise<boolean> => {
    this.logger.debug(`Validating admin request for userId: ${userId}`);

    const User = await this.userRepository.findOne({
      where: { id: userId, isAdmin: true },
    });

    if (!User) {
      this.logger.debug(`User with id ${userId} is not an admin.`);
      return false;
    }

    this.logger.debug(`User with id ${userId} is an admin.`);
    return true;
  };

  validateAuthMethods = async (authMethods: number[]) => {
    // Find AuthMethods by IDs
    const existingAuthMethods = (
      await this.authMethodRepository.findBy({
        id: In(authMethods),
      })
    ).map((am) => am.id);

    // Check if all provided IDs exist
    if (authMethods.length !== authMethods.length) {
      const notFoundAuths = authMethods.filter(
        (a) => !existingAuthMethods.includes(a),
      );

      throw new NotFoundError(
        `Some auth methods not found for IDs: ${JSON.stringify(notFoundAuths)}`,
      );
    }
  };
}

export { PackageAction };
