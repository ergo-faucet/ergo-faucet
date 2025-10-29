import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import {
  checkStatusOrGetAddressBody,
  CheckStatusOrGetAddressResponse200,
  PaymentAuthConfig,
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
  private readonly expiresTime: number;

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
    fastify.post<{ Body: typeof checkStatusOrGetAddressBody }>(
      '',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: [
          this.fastifyServer.authPreHandler(),
          this.fastifyServer.captchaPreHandler,
        ],
        schema: {
          body: checkStatusOrGetAddressBody,
          response: { 200: CheckStatusOrGetAddressResponse200 },
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
          if (paymentStatus === null) {
            this.logger.debug(
              `No payment record found for user ${user.userId}, package ${packageId}, auth method ${authMethodId}`,
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

            return reply.status(200).send(toDTO(newPaymentStatus));
          } else if (
            paymentStatus.status === 'expired' ||
            paymentStatus.status === 'failed'
          ) {
            const addressIndex =
              await this.paymentAction.getAndIncrementCounter();

            const newAddress =
              this.wallet.generateUniquePaymentAddress(addressIndex);

            const updatedPaymentStatus =
              await this.paymentAction.updateUserPaymentAuthStatus(
                paymentStatus,
                'pending',
                newAddress,
              );
            return reply.status(200).send(toDTO(updatedPaymentStatus));
          }

          return reply.status(200).send(toDTO(paymentStatus));
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
          assets = JSON.parse(currentConfig); //as TokenTargetAmount<bigint>[];
        }

        const isPaid: boolean = await this.nodeModel.checkForPayment(
          payment.metadata.address!,
          assets,
        );

        if (isPaid) {
          await this.paymentAction.updateUserPaymentAuthStatus(
            payment,
            'passed',
            undefined,
          );
        } else {
          /** There is no modifiedAt property for now */
          // const now = Math.floor(Date.now() / 1000);
          // const elapsed = now - payment.modifiedAt;
          // // Check if the payment has exceeded the allowed time window
          // if (elapsed > this.expiresTime) {
          //   this.logger.debug(
          //     `Payment ID ${payment.id} has expired. Elapsed time: ${elapsed}s, allowed time: ${this.expiresTime}s.`,
          //   );
          //   await this.paymentAction.updateUserPaymentAuthStatus(
          //     payment,
          //     'failed',
          //     undefined,
          //   );
          // }
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
