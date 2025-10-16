import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import { getAddressParam, PaymentAuthConfig } from './types';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { userRequestPayload } from '@ergo-faucet/common-types';

class PaymentAuth {
  private static instance: PaymentAuth;
  private readonly logger: AbstractLogger;
  private readonly wallet: Wallet;
  private readonly nodeModel: NodeModel;
  private readonly fastifyServer: FastifyAPIServer;

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
  }

  /**
   * Initializes the PaymentAuth singleton instance.
   * Throws an error if already initialized.
   * @param config - Configuration object for the PaymentAuth.
   * @param logger - Optional logger for debugging.
   */
  public static initialize = (
    config: PaymentAuthConfig,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error('PaymentAuth instance has already been initialized.');
    }
    PaymentAuth.instance = new PaymentAuth(config, logger);
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

  private checkStatusOrGetAddressRoute = async (
    fastify: FastifySeverInstance,
  ) => {
    fastify.get(
      '',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: [
          this.fastifyServer.authPreHandler(),
          //  this.fastifyServer.captchaPreHandler,
        ],
        schema: { params: getAddressParam },
      },
      async (request, reply) => {
        try {
          const user = request.user as userRequestPayload;
          const { packageId } = request.params as { packageId: number };

          this.logger.debug(
            `User ${user.userId} is checking payment auth status or getting address for package ${packageId}`,
          );

          // check database for user auth status for the packageId
          // if is there a pending or passed status return it
          // otherwise return a new address for payment
          // not implemented yet
        } catch (error) {
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
