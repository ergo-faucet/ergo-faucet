import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import {
  checkStatusOrGetAddressBody,
  CheckStatusOrGetAddressResponse200,
  PaymentAuthConfig,
  checkStatusOrGetAddressBodyType,
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
import { TokenTargetAmount } from '@fleet-sdk/common';

class PaymentAuth {
  private static instance: PaymentAuth;
  private readonly logger: AbstractLogger;
  private readonly wallet: Wallet;
  private readonly nodeModel: NodeModel;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly paymentAction: PaymentAction;

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

  public checkStatusOrGetAddressRoute = async (
    fastify: FastifySeverInstance,
  ) => {
    fastify.post<{ Body: checkStatusOrGetAddressBodyType }>(
      '',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: [
          //     this.fastifyServer.authPreHandler(),
          //    this.fastifyServer.captchaPreHandler,
        ],
        schema: {
          body: checkStatusOrGetAddressBody,
          response: { 200: CheckStatusOrGetAddressResponse200 },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (request, reply) => {
        try {
          // const user = request.user as userRequestPayload;

          const user = { userId: 1 } as userRequestPayload;
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
            const addressIndex =
              await this.paymentAction.getAndIncrementCounter();

            const newAddress =
              this.wallet.generateUniquePaymentAddress(addressIndex);
            const newPaymentStatus =
              await this.paymentAction.addUserPaymentAuthStatus(
                user.userId,
                authMethodId,
                packageId,
                newAddress,
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
              const addressIndex =
                await this.paymentAction.getAndIncrementCounter();

              const newAddress =
                this.wallet.generateUniquePaymentAddress(addressIndex);
              const newPaymentStatus =
                await this.paymentAction.addUserPaymentAuthStatus(
                  user.userId,
                  authMethodId,
                  packageId,
                  newAddress,
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
          this.logger.error(`Error fetching packages:`, {
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

  public processPayments = async (): Promise<void> => {
    try {
      const payments: UserAuthStatus[] =
        await this.paymentAction.getUnpaidRecords();

      if (payments.length === 0) {
        this.logger.debug('There is no payment to process.');
        return;
      }

      let prvConfig: string = '';
      let assets;
      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        const currentConfig = payment.authMethod.config;
        if (prvConfig !== currentConfig) {
          prvConfig = currentConfig;
          assets = JSON.parse(currentConfig) as TokenTargetAmount<string>[];

          if (!Array.isArray(assets)) {
            this.logger.warn(
              `Invalid config for payment ${payment.id}, skipping.`,
            );
            continue;
          }
        }

        const isPaid: boolean = await this.nodeModel.checkForPayment(
          payment.metadata.address!,
          assets!,
        );

        if (isPaid) {
          await this.paymentAction.passUserPayment(payment);
        } else {
          const now = Math.floor(Date.now() / 1000);
          const elapsed = now - payment.createdAt;
          // Check if the payment has exceeded the allowed time window (allowedTime = expiresTime + expiresTimeDelay)
          if (elapsed >= this.expiresTime + this.expiresTimeDelay) {
            this.logger.debug(
              `Payment ID ${payment.id} has expired. Elapsed time: ${elapsed}s, allowed backend time: ${this.expiresTime + this.expiresTimeDelay}s. Marking paymnet as failed.`,
            );
            await this.paymentAction.updateUserPaymentAuthStatus(
              payment,
              'failed',
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error during processPayments', {
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
