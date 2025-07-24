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
  private PackageReposotory: Repository<Package>;

  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.dataSource = dataSource;
    this.PackageReposotory = this.dataSource.getRepository(Package);
  }

  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error('PackageAction instance has already been initialized.');
    }

    PackageAction.instance = new PackageAction(dataSource, logger);
  };

  public static getInstance = (): PackageAction => {
    if (!this.instance) {
      throw new Error('PackageAction instance has not been initialized.');
    }
    return this.instance;
  };

  public getPackages = async (
    offset: number,
    limit: number,
    sort: string,
    order: string,
  ): Promise<Package[]> => {
    this.logger.debug(
      `Fetching packages from database offset:${offset}, limit:${limit}, sort:${sort}, order:${order}`,
    );

    let orderOption: FindOptionsOrder<Package> = { id: 'desc' };

    if (sort === 'name') {
      if (order === 'desc') orderOption = { name: 'desc' };
      else orderOption = { name: 'desc' };
    } else if (sort === 'release') {
      if (order === 'desc') orderOption = { openAt: 'desc' };
      else orderOption = { openAt: 'desc' };
    }

    const packages = this.PackageReposotory.find({
      where: { status: 'show' },
      order: orderOption,
      skip: offset,
      take: limit,
    });
    return packages;
  };
}

export { PackageAction };
