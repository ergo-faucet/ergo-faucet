import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import {
  checkStatusOrGetAddressBody,
  CheckStatusOrGetAddressResponse200,
  PaymentAuthConfig,
  checkStatusOrGetAddressBodyType,
  ErrorResponse,
} from './types';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { userRequestPayload } from '@ergo-faucet/common-types';
import {
  NotFoundError,
  PaymentAction,
  UserAuthStatus,
} from '@ergo-faucet/database';
import { toDTO } from './utils';

class PaymentAuth {
  private static instance: PaymentAuth;
  private readonly logger: AbstractLogger;
  private readonly wallet: Wallet;
  private readonly nodeModel: NodeModel;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly paymentAction: PaymentAction;
  private readonly ownerPk: string;
  private readonly maxAddress: number;
  private readonly expiresTime: number; // Time (in seconds) the user is allowed to complete the payment
  private readonly expiresTimeDelay: number; // Additional time (in seconds) allowed for delayed payments

  private readonly PAYMENT_AUTH_PREFIX = '/auth/payment';

  /**
   * Constructs an PaymentAuth instance.
   * @param config - Configuration object for the PaymentAuth.
   * @param logger - Optional logger for debugging.
   */
  protected constructor(config: PaymentAuthConfig, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.wallet = config.wallet;
    this.nodeModel = config.nodeModel;
    this.fastifyServer = config.fastifyServer;
    this.paymentAction = config.paymentAction;
    this.expiresTime = config.expiresTime;
    this.expiresTimeDelay = config.expiresTimeDelay;
    this.ownerPk = config.ownerPk;
    this.maxAddress = config.maxAddress;
  }

  /**
   * Initializes the PaymentAuth singleton instance.
   * Throws an error if already initialized.
   * @param config - Configuration object for the PaymentAuth.
   * @param logger - Optional logger for debugging.
   */
  public static initialize = async (
    config: PaymentAuthConfig,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance) {
      throw new Error('PaymentAuth instance has already been initialized.');
    }
    PaymentAuth.instance = new PaymentAuth(config, logger);
    await PaymentAuth.instance.registerRoutes(
      PaymentAuth.instance.PAYMENT_AUTH_PREFIX,
    );
  };

  /**
   * Returns the singleton instance of PaymentAuth.
   * Throws an error if not yet initialized.
   * @returns {PaymentAuth} The singleton instance.
   */
  public static getInstance = (): PaymentAuth => {
    if (!this.instance) {
      throw new Error('PaymentAuth instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Registers a POST route that returns an existing payment auth or issues a new one.
   *
   * - If no active payment record exists or the record is expired/failed, generates a new
   *   payment address, creates a pending UserAuthStatus and returns its DTO.
   * - If a pending record exists but its payment window has elapsed, marks it failed,
   *   issues a new address, creates a new pending record and returns its DTO.
   * - Otherwise returns the current payment auth DTO (pending or passed).
   *
   * @param fastify - Fastify server instance to register the route on.
   * @returns {Promise<void>}
   */
  public checkStatusOrGetAddressRoute = async (
    fastify: FastifySeverInstance,
  ) => {
    fastify.post<{ Body: checkStatusOrGetAddressBodyType }>(
      '',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: [
          this.fastifyServer.authPreHandler(),
          // this.fastifyServer.captchaPreHandler,
        ],
        schema: {
          body: checkStatusOrGetAddressBody,
          response: {
            200: CheckStatusOrGetAddressResponse200,
            400: ErrorResponse,
            403: ErrorResponse,
            500: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (request, reply) => {
        try {
          const user = request.user as userRequestPayload;
          const { packageId, authMethodId } = request.body;

          this.logger.debug(
            `User ${user.userId} is checking payment auth status or getting address for package ${packageId}`,
          );

          const paymentStatus =
            await this.paymentAction.getUserPaymentAuthStatus(
              user.userId,
              authMethodId,
              packageId,
            );

          if (
            paymentStatus === null ||
            paymentStatus.status === 'expired' ||
            paymentStatus.status === 'failed'
          ) {
            this.logger.debug(
              `No pending or passed payment record found for user ${user.userId}, package ${packageId}, auth method ${authMethodId}`,
            );

            const newPaymentStatus = await this.generateNewAddress(
              user.userId,
              authMethodId,
              packageId,
            );

            return reply
              .status(200)
              .send(toDTO(newPaymentStatus, this.expiresTime));
          }

          // Expire pending payment if its allowed payment window has passed.
          if (paymentStatus.status === 'pending') {
            const now = Math.floor(Date.now() / 1000); // In milliseconds
            const elapsed = now - paymentStatus.createdAt;

            this.logger.debug(
              `Payment ID ${paymentStatus.id} has expired. Elapsed time: ${elapsed}s, allowed user time: ${this.expiresTime}s. Marking paymnet as failed.`,
            );
            if (elapsed >= this.expiresTime) {
              await this.paymentAction.updateUserPaymentAuthStatus(
                paymentStatus,
                'failed',
              );

              const newPaymentStatus = await this.generateNewAddress(
                user.userId,
                authMethodId,
                packageId,
              );

              return reply
                .status(200)
                .send(toDTO(newPaymentStatus, this.expiresTime));
            }
          }

          return reply.status(200).send(toDTO(paymentStatus, this.expiresTime));
        } catch (error) {
          if (error instanceof NotFoundError) {
            this.logger.debug(error.message);
            return reply
              .status(400)
              .send({ error: error.message, code: 'NOT_FOUND' });
          }
          this.logger.error(`Error fetching or generating user auth status:`, {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          });

          reply.status(500).send({
            error: 'Internal server error occured',
            code: 'internal-error',
          });
        }
      },
    );
  };

  /**
   * Processes all pending payment auths.
   * @returns {Promise<void>}
   */
  public processPayments = async (): Promise<void> => {
    try {
      const payments: UserAuthStatus[] =
        await this.paymentAction.getUnpaidRecords();

      if (payments.length === 0) {
        this.logger.debug('There is no payment to process.');
        return;
      }

      this.logger.debug(
        `Found ${payments.length} payment requests to process.`,
      );

      for (const payment of payments) {
        this.handlePaymentAuth(payment);
      }
    } catch (error) {
      this.logger.warn('Error during processPayments', {
        message: error instanceof Error ? error.message : '',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  /**
   * Process a single pending payment authorization.
   *
   * - Validates that the auth method has a payment config.
   * - Checks the blockchain to see if the required ERG/tokens were paid to the stored address.
   *   - If paid, marks the UserAuthStatus as passed.
   *   - If not paid and the allowed window (expiresTime + expiresTimeDelay) has elapsed, marks it as failed.
   *
   * @param payment - The UserAuthStatus record to process.
   * @returns {Promise<void>}
   */
  public handlePaymentAuth = async (payment: UserAuthStatus): Promise<void> => {
    this.logger.debug(`Processing payment with id: ${payment.id}`);
    const assets = payment.authMethod.config.payment;
    if (!assets) {
      throw new Error(
        `Invalid config for auth method with id ${payment.authMethod.id}`,
      );
    }

    const isPaid: boolean = await this.nodeModel.checkForPayment(
      payment.metadata.address!,
      assets!,
    );

    if (isPaid) {
      await this.paymentAction.passUserPayment(payment);
    } else {
      // Check if the payment has exceeded the allowed time window (allowedTime = expiresTime + expiresTimeDelay)
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - payment.createdAt;
      if (elapsed >= this.expiresTime + this.expiresTimeDelay) {
        this.logger.debug(
          `Payment ID ${payment.id} has expired. Elapsed time: ${elapsed}s, allowed time with delay: ${this.expiresTime + this.expiresTimeDelay}s. Marking paymnet as failed.`,
        );
        await this.paymentAction.updateUserPaymentAuthStatus(payment, 'failed');
      }
    }
  };

  /**
   * Generate a new unique payment address and create a pending payment record.
   *
   * @param userId - ID of the user.
   * @param authMethodId - ID of the payment auth method.
   * @param packageId - ID of the package.
   * @returns {Promise<UserAuthStatus>} The newly created pending UserAuthStatus.
   * @throws {Error} If address generation or DB insertion fails.
   */
  private generateNewAddress = async (
    userId: number,
    authMethodId: number,
    packageId: number,
  ): Promise<UserAuthStatus> => {
    const addressIndex = await this.paymentAction.getAndIncrementCounter();

    const newAddress = this.wallet.generateUniquePaymentAddress(
      addressIndex,
      this.ownerPk,
    );
    return await this.paymentAction.addUserPaymentAuthStatus(
      userId,
      authMethodId,
      packageId,
      newAddress,
    );
  };

  private chunkAddresses = (
    addresses: UserAuthStatus[],
    limit: number,
  ): UserAuthStatus[][] => {
    const chunks: UserAuthStatus[][] = [];
    for (let i = 0; i < addresses.length; i += limit) {
      chunks.push(addresses.slice(i, i + limit));
    }
    return chunks;
  };

  /**
   * Collects all user payment boxes and marks them as collected.
   * @returns {Promise<void>}
   */
  public collectBoxes = async (): Promise<void> => {
    this.logger.debug('Collecting user payment boxes...');
    try {
      const addresses: UserAuthStatus[] =
        await this.paymentAction.getUserPaymentAddresses();
      if (addresses.length === 0) {
        this.logger.debug('No payment addresses found.');
        return;
      }

      this.logger.debug(`Found ${addresses.length} payment addresses.`);

      const chunks = this.chunkAddresses(addresses, this.maxAddress);
      for (const chunk of chunks) {
        try {
          await this.wallet.collectUserPaidBoxes(
            this.ownerPk,
            chunk.map((record) => record.metadata.address!),
          );
          await this.paymentAction.markAddressesAsCollected(chunk);
        } catch (error) {
          this.logger.debug(
            `Error during collectUserPaidBoxes with addresses: ${chunk.map((record) => record.metadata.address!)} `,
            {
              message: error instanceof Error ? error.message : '',
              stack: error instanceof Error ? error.stack : undefined,
            },
          );
        }
      }
    } catch (error) {
      this.logger.debug('Error during collectBoxes', {
        message: error instanceof Error ? error.message : '',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  /**
   * Registers the API routes for PaymentAuth.
   * @param prefix - URL prefix for the routes
   * @returns Promise<void>
   * under the specified prefix.
   */
  public registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(
      this.checkStatusOrGetAddressRoute,
      prefix,
    );
    this.logger.info(`Routes registered under prefix "${prefix}"`);
  };
}

export { PaymentAuth };
