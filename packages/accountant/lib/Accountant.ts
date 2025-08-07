import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { Network, SignedTransaction } from '@fleet-sdk/common';
import { AccountantConfig } from './types/accountantConfig';
import { AccountantAction, UserRequest } from '@ergo-faucet/database';
import { NodeModel } from './NodeModel';
import { Wallet } from './Wallet';
import { NotEnoughAssetsError } from './types';
import {
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';

class Accountant {
  private static instance: Accountant;
  private readonly logger: AbstractLogger;
  private readonly tryLimit: number;
  private readonly network: Network;
  private readonly accountantAction: AccountantAction;
  private readonly nodeModel: NodeModel;
  private readonly wallet: Wallet;
  private readonly minNanoErg: number;
  private readonly minFee: number;
  private readonly confirmationLimit: number;

  protected constructor(config: AccountantConfig, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.network = config.network;
    this.tryLimit = config.tryLimit;
    this.accountantAction = config.accountantAction;
    this.minFee = config.minFee;
    this.minNanoErg = config.minNanoErg;
    this.confirmationLimit = config.confirmationLimit;
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

  public processUserRequests = async (): Promise<void> => {
    this.logger.info('Starting processUserRequests job.');
    try {
      const requests = await this.accountantAction.getUnpaidRequests();
      this.logger.debug(`Found ${requests.length} user requests to process.`);

      for (const r of requests) {
        if (r.status === 'pending') await this.handlePendingRequest(r);
        else if (r.status === 'submitted') await this.handleSubmittedRequest(r);
      }
    } catch (error) {
      if (error instanceof Error) this.logger.error(error.message);
    }
  };

  public handlePendingRequest = async (req: UserRequest): Promise<void> => {
    try {
      if (req.numberOfTries > this.tryLimit) {
        await this.accountantAction.updateUserRequestPaymentInfo(
          req.id,
          'failed',
          '',
          req.numberOfTries,
        );
        return;
      }

      // Select input boxes
      const inputs = await this.wallet.selectBoxes(
        BigInt(this.minFee + this.minNanoErg),
        req.package.assets,
      );

      // Generate unsigned transaction
      const currentHeight = await this.nodeModel.getCurrentBlockchainHeight();

      const unsignedTx: ErgoUnsignedTransaction = new TransactionBuilder(
        currentHeight,
      )
        .from(inputs)
        .to(
          new OutputBuilder(
            this.minNanoErg.toString(),
            req.destinationAddress,
          ).addTokens(req.package.assets),
        )
        .sendChangeTo(this.wallet.getWalletAddress())
        .payFee(this.minFee.toString())
        .build();

      // Sign Transction
      const signedTx = this.wallet.signTransaction(unsignedTx);

      // Submit Transaction to network
      const transactionId = await this.nodeModel.submitTransaction(signedTx);
      this.logger.debug('Transaction sent successfully', {
        transactionId,
      });
      await this.accountantAction.updateUserRequestPaymentInfo(
        req.id,
        'submitted',
        JSON.stringify(signedTx),
        req.numberOfTries + 1,
      );
    } catch (error) {
      if (error instanceof NotEnoughAssetsError) {
        this.logger.error(error.message);
        await this.accountantAction.updateUserRequestPaymentInfo(
          req.id,
          'pending',
          '',
          req.numberOfTries + 1,
        );
        return;
      }
      throw error;
    }
  };

  public handleSubmittedRequest = async (req: UserRequest): Promise<void> => {
    try {
      if (!req.signedTx) {
        await this.accountantAction.updateUserRequestPaymentInfo(
          req.id,
          'pending',
          '',
          req.numberOfTries,
        );
        return;
      }
      const signedTx: SignedTransaction = JSON.parse(req.signedTx);
      const transactionId = signedTx.id;

      const isInMempool =
        await this.nodeModel.isTransactionInMempool(transactionId);
      const isMined = await this.nodeModel.isTransactionMined(transactionId);

      if (isMined) {
        const currentHeight = await this.nodeModel.getCurrentBlockchainHeight();
        const confirmations = currentHeight - req.creationHeight!;
        if (confirmations > this.confirmationLimit)
          await this.accountantAction.updateUserRequestPaymentInfo(
            req.id,
            'paid',
            '',
            req.numberOfTries,
          );
        return;
      }
      if (!isInMempool) {
        // Submit existing Transaction to network once again
        const transactionId = await this.nodeModel.submitTransaction(signedTx);
        this.logger.debug('Transaction sent successfully', {
          transactionId,
        });
        return;
      }
    } catch (error) {
      if (error instanceof Error) this.logger.debug(error.message);
      await this.accountantAction.updateUserRequestPaymentInfo(
        req.id,
        'pending',
        '',
        req.numberOfTries,
      );
    }
  };
}

export { Accountant };
