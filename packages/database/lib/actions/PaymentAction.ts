import {
  And,
  DataSource,
  ILike,
  Not,
  Repository,
} from '@rosen-bridge/extended-typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AuthMethod,
  Counter,
  Package,
  User,
  UserAuthStatus,
} from '../entities';
import { NotFoundError } from '../types';

class PaymentAction {
  private static instance: PaymentAction;

  private logger: AbstractLogger;
  private dataSource: DataSource;
  private userAuthStatusRepository: Repository<UserAuthStatus>;
  private packageRepository: Repository<Package>;
  private authmethodRepository: Repository<AuthMethod>;
  private userRepository: Repository<User>;

  private counterRepository: Repository<Counter>;
  private readonly paymentPattern = 'p-';

  /**
   * Constructs an PaymentAction instance.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger for debugging.
   */
  protected constructor(dataSource: DataSource, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.dataSource = dataSource;
    this.userAuthStatusRepository =
      this.dataSource.getRepository(UserAuthStatus);

    this.packageRepository = this.dataSource.getRepository(Package);
    this.authmethodRepository = this.dataSource.getRepository(AuthMethod);
    this.userRepository = this.dataSource.getRepository(User);
    this.counterRepository = this.dataSource.getRepository(Counter);

    this.logger.debug('PaymentAction instance created.');
  }

  /**
   * Initializes the PaymentAction singleton instance.
   * Throws an error if already initialized.
   * @param dataSource - The TypeORM DataSource instance.
   * @param logger - Optional logger for debugging.
   */
  public static initialize = (
    dataSource: DataSource,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error('PaymentAction instance has already been initialized.');
    }

    PaymentAction.instance = new PaymentAction(dataSource, logger);
    PaymentAction.instance.logger.info(
      'PaymentAction singleton instance initialized.',
    );
  };

  /**
   * Returns the singleton instance of PaymentAction.
   * Throws an error if not yet initialized.
   * @returns {PaymentAction} The singleton instance.
   */
  public static getInstance = (): PaymentAction => {
    if (!this.instance) {
      throw new Error('PaymentAction instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Retrieve an active payment authorization record for a user, auth method and package.
   *
   * - Validates that the package, payment auth method (matching payment pattern) and user exist.
   * - Ensures the auth method is associated with the package.
   * - Returns the UserAuthStatus excluding records with status 'failed' or 'expired'.
   *
   * @param userId - ID of the user.
   * @param authMethodId - ID of the auth method (must be a payment auth).
   * @param packageId - ID of the package.
   * @returns {Promise<UserAuthStatus | null>} The active payment auth record, or null if none found.
   * @throws {NotFoundError} If package, auth method, user, or the package→auth association is missing.
   */
  public getUserPaymentAuthStatus = async (
    userId: number,
    authMethodId: number,
    packageId: number,
  ): Promise<UserAuthStatus | null> => {
    this.logger.debug(
      `Checking payment record for user ID: ${userId} for package with Id ${packageId} with auth method ID: ${authMethodId}`,
    );
    const pkg = await this.packageRepository.findOne({
      where: { id: packageId },
      relations: ['packageAuthMethods', 'packageAuthMethods.authMethod'],
    });
    if (!pkg) {
      throw new NotFoundError(`Package with Id ${packageId} not found`);
    }

    const paymentAuth = await this.authmethodRepository.findOneBy({
      id: authMethodId,
      name: ILike(`%${this.paymentPattern}%`),
    });
    if (!paymentAuth) {
      throw new NotFoundError(`PaymentAuth with Id ${authMethodId} not found`);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundError(`User with Id ${userId} not found`);
    }

    // Check if the package includes the given auth method
    const hasAuthMethod = pkg.packageAuthMethods.some(
      (pam) => pam.authMethod.id === authMethodId,
    );
    if (!hasAuthMethod) {
      throw new NotFoundError(
        `AuthMethod with Id ${authMethodId} not found in Package ${packageId}`,
      );
    }

    const userPaymentAuthStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user: { id: userId },
        package: { id: packageId },
        authMethod: { id: authMethodId },
        status: And(Not('failed'), Not('expired')),
      },
      relations: ['authMethod'],
    });

    return userPaymentAuthStatus;
  };

  /**
   * Creates and stores a new pending payment authorization for a user.
   *
   * - Ensures the referenced user, package and auth method exist.
   * - Inserts a UserAuthStatus with status 'pending' and metadata.address = paymentAddress.
   *
   * @param userId - ID of the user requesting payment.
   * @param authMethodId - ID of the payment auth method.
   * @param packageId - ID of the package the payment is for.
   * @param paymentAddress - The generated payment address to associate with this auth.
   * @returns {Promise<UserAuthStatus>} The created UserAuthStatus entity.
   * @throws {NotFoundError} If the user, package, or auth method cannot be found.
   */
  public addUserPaymentAuthStatus = async (
    userId: number,
    authMethodId: number,
    packageId: number,
    paymentAddress: string,
  ): Promise<UserAuthStatus> => {
    this.logger.debug(
      `Adding payment record for user ID: ${userId} for package with Id ${packageId}  with auth method ID: ${authMethodId} and payment address: ${paymentAddress}`,
    );
    const pkg = await this.packageRepository.findOneBy({ id: packageId });

    const paymentAuth = await this.authmethodRepository.findOneBy({
      id: authMethodId,
    });

    const user = await this.userRepository.findOneBy({ id: userId });

    const now = Math.floor(Date.now() / 1000);

    const newUserPaymentAuthStatus = this.userAuthStatusRepository.create({
      user: user!,
      authMethod: paymentAuth!,
      package: pkg!,
      createdAt: now,
      modifiedAt: now,
      status: 'pending',
      metadata: {
        address: paymentAddress,
      },
    });

    await this.userAuthStatusRepository.insert(newUserPaymentAuthStatus);
    this.logger.info(
      `Payment record added for user ID: ${userId} for package with Id ${packageId}  with auth method ID: ${authMethodId}`,
    );

    return newUserPaymentAuthStatus;
  };

  /**
   * Updates a UserAuthStatus record and persists the change.
   *
   * - Sets the new status and updates modifiedAt to current epoch seconds.
   * - If provided, stores the payment address in the record's metadata.
   *
   * @param userAuthStatus - The UserAuthStatus entity to update.
   * @param status - New status ( 'failed' | 'pending' | 'expired').
   * @param paymentAddress - Optional payment address to save in metadata.
   * @returns {Promise<UserAuthStatus>} The updated and saved UserAuthStatus.
   * @throws {Error} If the repository save operation fails.
   */
  public updateUserPaymentAuthStatus = async (
    userAuthStatus: UserAuthStatus,
    status: 'failed' | 'pending' | 'expired',
    paymentAddress?: string,
  ): Promise<UserAuthStatus> => {
    this.logger.debug(
      `Updating payment auth status for user ID: ${userAuthStatus.user.id}, package ID: ${userAuthStatus.package!.id}, auth method ID: ${userAuthStatus.authMethod.id} to status: ${status}.`,
    );

    userAuthStatus.status = status;
    userAuthStatus.modifiedAt = Math.floor(Date.now() / 1000);
    if (paymentAddress) {
      userAuthStatus.metadata = {
        address: paymentAddress,
      };
    }

    await this.userAuthStatusRepository.save(userAuthStatus);
    this.logger.info(
      `Payment auth status for user ID: ${userAuthStatus.user.id}, package ID: ${userAuthStatus.package!.id}, auth method ID: ${userAuthStatus.authMethod.id} updated to status: ${status}.`,
    );
    return userAuthStatus;
  };

  /**
   Marks a payment authorization record as passed.
   *
   * - Sets status to 'passed' and updates verifiedAt and modifiedsAt to the current epoch seconds.
   *
   * @param payment - The UserAuthStatus record to mark as passed.
   * @returns {Promise<void>} Resolves after the record is saved.
   * @throws {Error} If the database save operation fails.
   */
  public passUserPayment = async (payment: UserAuthStatus): Promise<void> => {
    const now = Math.floor(Date.now() / 1000);
    payment.status = 'passed';
    payment.verifiedAt = now;
    payment.modifiedAt = now;

    await this.userAuthStatusRepository.save(payment);
  };

  /**
   * Retrieves the current counter value and increments it in the database atomically.
   *
   * - Creates a counter record with initial value 1 if none exists.
   * - Uses pessimistic locking to ensure atomic read and increment.
   *
   * @returns {Promise<number>} The counter value prior to the increment.
   * @throws {Error} If a database operation fails.
   */
  public getAndIncrementCounter = async (): Promise<number> => {
    return await this.counterRepository.manager.transaction(
      'SERIALIZABLE',
      async (transactionalEntityManager) => {
        const counterRepo = transactionalEntityManager.getRepository(Counter);

        // Lock the row for update to prevent concurrent modifications
        let counterRecord = await counterRepo.findOne({
          where: { id: 1 },
          lock: { mode: 'pessimistic_write' },
        });

        // Create initial counter if it doesn't exist
        if (!counterRecord) {
          counterRecord = counterRepo.create({ count: 1 });
          await counterRepo.save(counterRecord);
          this.logger.debug(`Counter initialized to 1`);
          return 0; // Return 0 as the previous value
        }

        const currentCount = counterRecord.count;
        counterRecord.count += 1;
        await counterRepo.save(counterRecord);

        this.logger.debug(`Counter incremented to ${currentCount + 1}`);
        return currentCount;
      },
    );
  };

  /**
   * Fetches all pending payment authorization records.
   *
   * @returns {Promise<UserAuthStatus[]>} Array of pending payment auth records.
   */
  public getUnpaidRecords = async (): Promise<UserAuthStatus[]> => {
    return await this.userAuthStatusRepository.find({
      where: {
        status: 'pending',
        authMethod: { name: ILike(`%${this.paymentPattern}%`) },
      },
      relations: ['package', 'authMethod', 'user'],
    });
  };
}

export { PaymentAction };
