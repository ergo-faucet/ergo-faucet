import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { Network } from '@fleet-sdk/common';
import { AccountantConfig } from './types/accountantConfig';
import { AccountantAction } from '@ergo-faucet/database';
import { NodeModel } from './NodeModel';
import { Wallet } from './Wallet';

class Accountant {
  private static instance: Accountant;
  private readonly logger: AbstractLogger;
  private readonly tryLimit: number;
  private readonly network: Network;
  private readonly accountantAction: AccountantAction;
  private readonly nodeModel: NodeModel;
  private readonly wallet: Wallet;

  protected constructor(config: AccountantConfig, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.network = config.network;
    this.tryLimit = config.tryLimit;
    this.accountantAction = config.accountantAction;
    NodeModel.initialize(config.nodeUrl, logger);
    this.nodeModel = NodeModel.getInstance();
    Wallet.initialize(config.mnemonic, this.network, logger);
    this.wallet = Wallet.getInstance();
    this.logger.debug(
      `Accountant initialized with network: ${this.network} and try limit: ${this.tryLimit}`,
    );
  }

  public static initialize = (
    config: AccountantConfig,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error('Accountant instance has already been initialized.');
    }

    Accountant.instance = new Accountant(config, logger);
  };

  /**
   * Returns the singleton instance of Accountant.
   * Throws an error if not yet initialized.
   * @returns {Accountant} The singleton instance.
   */
  public static getInstance = (): Accountant => {
    if (!this.instance) {
      throw new Error('Accountant instance has not been initialized.');
    }
    return this.instance;
  };
}

export { Accountant };
