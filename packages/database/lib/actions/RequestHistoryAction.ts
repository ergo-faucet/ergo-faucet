import {
  DataSource,
  FindOptionsOrder,
  Repository,
} from '@rosen-bridge/extended-typeorm';
import { UserRequest } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { RequestDTO } from '../types';

class RequestHistoryAction {
  private static instance: RequestHistoryAction;

  private logger: AbstractLogger;
  private dataSource: DataSource;
  private userRequestRepository: Repository<UserRequest>;

  /**
   * Protected constructor to enforce singleton pattern.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.dataSource = dataSource;
    this.userRequestRepository = this.dataSource.getRepository(UserRequest);
  }

  /**
   * Initializes the RequestHistoryAction singleton with the given DataSource and optional logger.
   * Throws an error if already initialized.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error(
        'RequestHistoryAction instance has already been initialized.',
      );
    }

    RequestHistoryAction.instance = new RequestHistoryAction(
      dataSource,
      logger,
    );
  };

  /**
   * Returns the singleton instance of RequestHistoryAction.
   * Throws an error if not yet initialized.
   * @returns {RequestHistoryAction} The singleton instance.
   */
  public static getInstance = (): RequestHistoryAction => {
    if (!this.instance) {
      throw new Error(
        'RequestHistoryAction instance has not been initialized.',
      );
    }
    return this.instance;
  };

  /**
   * Fetches request history from the database with pagination and sorting.
   *
   * @param offset - The number of records to skip.
   * @param limit - The maximum number of records to return.
   * @param sort - The field to sort by ('destinationAddress', 'timestamp', or 'status').
   * @param order - The sort order ('asc' or 'desc').
   * @returns {Promise<RequestDTO[]>} - Array of RequestDTO entities.
   */

  public getRequestHistory = async (
    offset: number,
    limit: number,
    sort: 'timestamp' | 'status' | 'createdAt' | 'modifiedAt',
    order: 'asc' | 'desc',
  ): Promise<RequestDTO[]> => {
    this.logger.debug(
      `Fetching packages from database offset:${offset}, limit:${limit}, sort:${sort}, order:${order}`,
    );

    const orderOption: FindOptionsOrder<UserRequest> = { [sort]: order };

    const requests = await this.userRequestRepository.find({
      order: orderOption,
      skip: offset,
      take: limit,
      relations: ['user', 'package'],
    });

    return requests.map(
      (r: UserRequest): RequestDTO => ({
        packageId: r.package.id,
        packageName: r.package.name,
        status: r.status,
        timestamp: r.timestamp,
        destinationAddress: r.destinationAddress,
        txId: r.txId || undefined,
      }),
    );
  };
}

export { RequestHistoryAction };
