import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import { PaymentAuthConfig } from './types';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

class PaymentAuth {
  private static instance: PaymentAuth;
  private readonly logger: AbstractLogger;
  private readonly wallet: Wallet;
  private readonly nodeModel: NodeModel;

  /**
   * Constructs an PaymentAuth instance.
   * @param config - Configuration object for the PaymentAuth.
   * @param logger - Optional logger for debugging.
   */
  protected constructor(config: PaymentAuthConfig, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.wallet = config.wallet;
    this.nodeModel = config.nodeModel;
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
}

export { PaymentAuth };
