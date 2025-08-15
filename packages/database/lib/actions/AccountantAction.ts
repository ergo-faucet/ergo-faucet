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

    this.logger.debug('AccountantAction instance created.');
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
    AccountantAction.instance.logger.info(
      'AccountantAction singleton instance initialized.',
    );
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
      'Fetching user requests with status "pending" or "submitted" from the database.',
    );
    const requests = await this.userRequestRepository.find({
      where: [{ status: 'pending' }, { status: 'submitted' }],
      order: { id: 'asc' }, // From oldest to newest request
    });
    this.logger.info(`Fetched ${requests.length} unpaid user requests.`);
    return requests;
  };

  /**
   * Updates payment information for a specific user request.
   * Logs the update operation and handles cases where the request is not found.
   * @param userRequestId - The ID of the user request to update.
   * @param status - The new status ('pending', 'submitted', 'paid', 'failed').
   * @param numberOfTries - The number of payment attempts.
   * @param txSerialized - The serialized transaction string (optional).
   * @param txId - The transaction ID (optional).
   * @returns {Promise<void>}
   */
  public updateUserRequestPaymentInfo = async (
    userRequestId: number,
    status: 'pending' | 'submitted' | 'paid' | 'failed',
    numberOfTries: number,
    txSerialized?: string,
    txId?: string,
  ): Promise<void> => {
    this.logger.debug(
      `Updating payment info for user request ID: ${userRequestId}.`,
    );

    const userRequest = await this.userRequestRepository.findOne({
      where: { id: userRequestId },
    });

    if (!userRequest) {
      this.logger.debug(
        `No user request found with ID: ${userRequestId}. Update operation aborted.`,
      );
      return;
    }

    // Update user request fields
    userRequest.status = status;
    userRequest.txSerialized = txSerialized ? txSerialized : null;
    userRequest.txId = txId ? txId : null;
    userRequest.numberOfTries = numberOfTries;

    // Save updated user request
    await this.userRequestRepository.save(userRequest);

    this.logger.debug(
      `User request with ID: ${userRequestId} updated successfully. Status: ${status}, Number of Tries: ${numberOfTries}`,
    );
  };

  /**
   * Updates the creation height for a specific user request.
   * Logs the update operation and handles cases where the request is not found.
   * @param userRequestId - The ID of the user request to update.
   * @param creationHeight - The new creation height to set.
   * @returns {Promise<void>}
   */
  public updateCreationHeight = async (
    userRequestId: number,
    creationHeight: number,
  ): Promise<void> => {
    this.logger.debug(
      `Updating creation height for user request ID: ${userRequestId}.`,
    );
    // Fetch the user request from the database
    const userRequest = await this.userRequestRepository.findOne({
      where: { id: userRequestId },
    });

    if (!userRequest) {
      this.logger.debug(
        `No user request found with ID: ${userRequestId}. Update operation aborted.`,
      );
      return;
    }
    // Update creation height
    userRequest.creationHeight = creationHeight;

    // Save updated user request
    await this.userRequestRepository.save(userRequest);

    this.logger.debug(
      `Creation height for user request ID: ${userRequestId} updated to ${creationHeight}.`,
    );
  };
}

export { AccountantAction };
