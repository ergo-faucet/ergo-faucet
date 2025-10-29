import { DataSource, ILike, Repository } from '@rosen-bridge/extended-typeorm';
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
  private readonly paymentPattern = 'p-*';

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

  public getUserPaymentAuthStatus = async (
    userId: number,
    authMethodId: number,
    packageId: number,
  ): Promise<UserAuthStatus | null> => {
    this.logger.debug(
      `Checking payment record for user ID: ${userId} for package with Id ${packageId}  with auth method ID: ${authMethodId}`,
    );
    const pkg = await this.packageRepository.findOneBy({ id: packageId });
    if (!pkg) {
      throw new NotFoundError(`Package with Id ${packageId} not found`);
    }

    const paymentAuth = await this.authmethodRepository.findOneBy({
      id: authMethodId,
    });
    if (!paymentAuth) {
      throw new NotFoundError(`PaymentAuth with Id ${authMethodId} not found`);
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundError(`User with Id ${userId} not found`);
    }

    const userPaymentAuthStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user,
        package: pkg,
        authMethod: paymentAuth,
      },
      relations: ['authMethod'],
    });

    return userPaymentAuthStatus;
  };

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

    const userPaymentAuthStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user: user!,
        package: pkg!,
        authMethod: paymentAuth!,
      },
      relations: ['authMethod'],
    });

    if (!userPaymentAuthStatus) {
      const newUserPaymentAuthStatus = this.userAuthStatusRepository.create({
        user: user!,
        authMethod: paymentAuth!,
        package: pkg!,
        verifiedAt: new Date(),
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
    }

    const status = userPaymentAuthStatus.status;
    // if status is not passed or pending, reset it to pending
    if (status !== 'passed' && status !== 'pending') {
      userPaymentAuthStatus.status = 'pending';
      userPaymentAuthStatus.metadata = {
        address: paymentAddress,
      };
      await this.userAuthStatusRepository.save(userPaymentAuthStatus);
      this.logger.info(
        `Payment record status reset to pending for user ID: ${userId} for package with Id ${packageId}  with auth method ID: ${authMethodId}`,
      );
    }
    return userPaymentAuthStatus;
  };

  updateUserPaymentAuthStatusUsingIds = async (
    userId: number,
    packageId: number,
    authMethodId: number,
    status: 'passed' | 'failed' | 'pending' | 'expired',
    paymentAddress?: string,
  ): Promise<UserAuthStatus> => {
    this.logger.debug(
      `Updating payment auth status for user ID: ${userId}, package ID: ${packageId}, auth method ID: ${authMethodId} to status: ${status}.`,
    );

    const userPaymentAuthStatus = await this.userAuthStatusRepository.findOne({
      where: {
        user: { id: userId },
        package: { id: packageId },
        authMethod: { id: authMethodId },
      },
      relations: ['authMethod'],
    });

    if (!userPaymentAuthStatus) {
      throw new NotFoundError(
        `Payment auth status not found for user ID: ${userId}, package ID: ${packageId}, auth method ID: ${authMethodId}.`,
      );
    }

    userPaymentAuthStatus.status = status;
    userPaymentAuthStatus.metadata = {
      address: paymentAddress,
    };
    await this.userAuthStatusRepository.save(userPaymentAuthStatus);
    this.logger.info(
      `Payment auth status for user ID: ${userId}, package ID: ${packageId}, auth method ID: ${authMethodId} updated to status: ${status}.`,
    );
    return userPaymentAuthStatus;
  };

  updateUserPaymentAuthStatus = async (
    userAuthStatus: UserAuthStatus,
    status: 'passed' | 'failed' | 'pending' | 'expired',
    paymentAddress?: string,
  ): Promise<UserAuthStatus> => {
    this.logger.debug(
      `Updating payment auth status for user ID: ${userAuthStatus.user.id}, package ID: ${userAuthStatus.package!.id}, auth method ID: ${userAuthStatus.authMethod.id} to status: ${status}.`,
    );

    userAuthStatus.status = status;
    userAuthStatus.metadata = {
      address: paymentAddress,
    };

    await this.userAuthStatusRepository.save(userAuthStatus);
    this.logger.info(
      `Payment auth status for user ID: ${userAuthStatus.user.id}, package ID: ${userAuthStatus.package!.id}, auth method ID: ${userAuthStatus.authMethod.id} updated to status: ${status}.`,
    );
    return userAuthStatus;
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
          where: {},
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

        // Use atomic increment
        await counterRepo.increment({ count: counterRecord.count }, 'count', 1);

        this.logger.debug(`Counter incremented to ${currentCount + 1}`);
        return currentCount;
      },
    );
  };

  getUnpaidRecords = async (): Promise<UserAuthStatus[]> => {
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
