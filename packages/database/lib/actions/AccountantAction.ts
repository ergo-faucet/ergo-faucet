import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';
import { UserRequest } from '../entities';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class AccountantAction {
  private static instance: AccountantAction;

  private logger: AbstractLogger;
  private dataSource: DataSource;
  private userRequestRepository: Repository<UserRequest>;

  /**
   * Constructs an AccountantAction instance.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger for debugging.
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.dataSource = dataSource;
    this.userRequestRepository = this.dataSource.getRepository(UserRequest);
  }

  /**
   * Initializes the AccountantAction singleton instance.
   * Throws an error if already initialized.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger for debugging.
   */
  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error(
        'AccountantAction instance has already been initialized.',
      );
    }

    AccountantAction.instance = new AccountantAction(dataSource, logger);
  };

  /**
   * Returns the singleton instance of AccountantAction.
   * Throws an error if not yet initialized.
   * @returns {AccountantAction} The singleton instance.
   */
  public static getInstance = (): AccountantAction => {
    if (!this.instance) {
      throw new Error('AccountantAction instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Fetches all user requests with status 'pending' or 'submitted'.
   * Orders results from oldest to newest.
   * @returns {Promise<UserRequest[]>} Array of unpaid user requests.
   */
  public getUnpaidRequests = async (): Promise<UserRequest[]> => {
    this.logger.debug(
      'Fetching pending or submitted user requests from database ',
    );
    return await this.userRequestRepository.find({
      where: [{ status: 'pending' }, { status: 'submitted' }],
      order: { id: 'asc' }, //from oldest to newest request
    });
  };

  /**
   * Updates payment information for a specific user request.
   * @param userRequestId - The ID of the user request to update.
   * @param status - The new status ('pending', 'submitted', 'paid', 'failed').
   * @param signedTx - The signed transaction string.
   * @param numberOfTries - The number of payment attempts.
   * @returns {Promise<void>}
   */
  public updateUserRequestPaymentInfo = async (
    userRequestId: number,
    status: 'pending' | 'submitted' | 'paid' | 'failed',
    signedTx: string,
    numberOfTries: number,
  ): Promise<void> => {
    const userRequest = await this.userRequestRepository.findOne({
      where: { id: userRequestId },
    });
    if (!userRequest) {
      this.logger.debug(`There is no user request with id ${userRequestId}`);
      return;
    }
    userRequest.status = status;
    userRequest.signedTx = signedTx;
    userRequest.numberOfTries = numberOfTries;

    await this.userRequestRepository.save(userRequest);
    this.logger.debug(
      `User request with id ${userRequestId} updated with status: ${status} numberOfTries: ${numberOfTries}`,
    );
  };
}
export { AccountantAction };
