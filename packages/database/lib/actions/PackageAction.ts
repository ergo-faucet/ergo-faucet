import {
  DataSource,
  FindOptionsOrder,
  Repository,
} from '@rosen-bridge/extended-typeorm';
import { Package } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class PackageAction {
  private static instance: PackageAction;

  private logger: AbstractLogger;
  private dataSource: DataSource;
  private PackageRepository: Repository<Package>;

  /**
   * Protected constructor to enforce singleton pattern.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.dataSource = dataSource;
    this.PackageRepository = this.dataSource.getRepository(Package);
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
    sort: string,
    order: string,
  ): Promise<Package[]> => {
    this.logger.debug(
      `Fetching packages from database offset:${offset}, limit:${limit}, sort:${sort}, order:${order}`,
    );

    // Default order option
    let orderOption: FindOptionsOrder<Package> = { id: 'desc' };

    // Set order option based on sort and order parameters
    if (sort === 'name') {
      if (order === 'desc') orderOption = { name: 'desc' };
      else orderOption = { name: 'desc' }; // Only 'desc' is used here, could be improved
    } else if (sort === 'release') {
      if (order === 'desc') orderOption = { openAt: 'desc' };
      else orderOption = { openAt: 'desc' }; // Only 'desc' is used here, could be improved
    }

    // Query the database for packages with status 'show'
    const packages = this.PackageRepository.find({
      where: { status: 'show' },
      order: orderOption,
      skip: offset,
      take: limit,
    });
    return packages;
  };
}

export { PackageAction };
