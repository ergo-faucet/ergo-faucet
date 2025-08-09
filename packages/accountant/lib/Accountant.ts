import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { AccountantAction, UserRequest } from '@ergo-faucet/database';
import { AccountantConfig, NotEnoughAssetsError } from './types';
import { NodeModel } from './NodeModel';
import { Wallet } from './Wallet';
import {
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { Network } from '@fleet-sdk/common';
import { hex } from '@fleet-sdk/crypto';
import { serializeTransaction } from '@fleet-sdk/serializer';
import { DoubleSpendError } from './types/errors';

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

  /**
   * Constructs an Accountant instance.
   * @param config - Configuration object for the Accountant.
   * @param logger - Optional logger for debugging.
   */
  protected constructor(config: AccountantConfig, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.network = config.network;
    this.tryLimit = config.tryLimit;
    this.accountantAction = config.accountantAction;
    this.minFee = config.minFee;
    this.minNanoErg = config.minNanoErg;
    this.confirmationLimit = config.confirmationLimit;

    // Initialize NodeModel and Wallet
    NodeModel.initialize(config.nodeUrl, logger);
    this.nodeModel = NodeModel.getInstance();
    Wallet.initialize(config.mnemonic, this.network, logger);
    this.wallet = Wallet.getInstance();

    this.logger.debug(
      `Accountant initialized with network: ${this.network}, try limit: ${this.tryLimit}, and confirmation limit: ${this.confirmationLimit}`,
    );
  }

  /**
   * Initializes the Accountant singleton instance.
   * Throws an error if already initialized.
   * @param config - Configuration object for the Accountant.
   * @param logger - Optional logger for debugging.
   */
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

  /**
   * Processes all unpaid user requests by handling their statuses.
   * Logs the number of requests found and processes them accordingly.
   * @returns {Promise<void>}
   */
  public processUserRequests = async (): Promise<void> => {
    this.logger.info('Starting processUserRequests job.');
    try {
      const requests = await this.accountantAction.getUnpaidRequests();
      this.logger.debug(`Found ${requests.length} user requests to process.`);

      for (const r of requests) {
        if (r.status === 'pending') {
          this.logger.debug(`Processing pending request with ID: ${r.id}`);
          await this.handlePendingRequest(r);
        } else if (r.status === 'submitted') {
          this.logger.debug(`Processing submitted request with ID: ${r.id}`);
          await this.handleSubmittedRequest(r);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error during processUserRequests: ${error.message}`);
      }
    }
  };

  /**
   * Handles a user request with a 'pending' status.
   * Attempts to create and submit a transaction for the request.
   * @param req - The user request to process.
   * @returns {Promise<void>}
   */
  public handlePendingRequest = async (req: UserRequest): Promise<void> => {
    try {
      if (req.numberOfTries > this.tryLimit) {
        this.logger.debug(
          `Request with ID: ${req.id} exceeded try limit. Marking as failed.`,
        );
        await this.accountantAction.updateUserRequestPaymentInfo(
          req.id,
          'failed',
          req.numberOfTries,
        );
        return;
      }

      // Select input boxes
      this.logger.debug(`Selecting input boxes for request ID: ${req.id}`);
      const inputs = await this.wallet.selectBoxes(
        BigInt(this.minFee + this.minNanoErg),
        req.package.assets,
      );

      // Generate unsigned transaction
      const currentHeight = await this.nodeModel.getCurrentBlockchainHeight();
      this.logger.debug(
        `Current blockchain height: ${currentHeight}. Building transaction for request ID: ${req.id}`,
      );

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

      // Sign transaction
      this.logger.debug(`Signing transaction for request ID: ${req.id}`);
      const signedTx = this.wallet.signTransaction(unsignedTx);
      const serialized = hex.encode(serializeTransaction(signedTx).toBytes());

      // Submit transaction to the network
      this.logger.debug(`Submitting transaction for request ID: ${req.id}`);
      const transactionId =
        await this.nodeModel.submitTransactionBytes(serialized);

      this.logger.debug(
        `Transaction submitted successfully for request ID: ${req.id}. Transaction ID: ${transactionId}`,
      );
      await this.accountantAction.updateUserRequestPaymentInfo(
        req.id,
        'submitted',
        req.numberOfTries + 1,
        serialized,
        transactionId,
      );
    } catch (error) {
      if (error instanceof NotEnoughAssetsError) {
        this.logger.error(`${error.message} request ID: ${req.id}`);
        await this.accountantAction.updateUserRequestPaymentInfo(
          req.id,
          'pending',
          req.numberOfTries + 1,
        );
        return;
      }
      throw error;
    }
  };

  /**
   * Handles a user request with a 'submitted' status.
   * Checks the transaction status and updates the request accordingly.
   * @param req - The user request to process.
   * @returns {Promise<void>}
   */
  public handleSubmittedRequest = async (req: UserRequest): Promise<void> => {
    try {
      if (!req.txSerialized) {
        this.logger.debug(
          `Request ID: ${req.id} has no serialized transaction. Marking as pending.`,
        );
        await this.accountantAction.updateUserRequestPaymentInfo(
          req.id,
          'pending',
          req.numberOfTries,
        );
        return;
      }

      const transactionId = req.txId!;
      this.logger.debug(
        `Checking transaction status for request ID: ${req.id}, Transaction ID: ${transactionId}`,
      );

      const isInMempool =
        await this.nodeModel.isTransactionInMempool(transactionId);
      const isMined = await this.nodeModel.isTransactionMined(transactionId);

      if (isMined) {
        const currentHeight = await this.nodeModel.getCurrentBlockchainHeight();

        const confirmations = currentHeight - req.creationHeight!;
        this.logger.debug(
          `Transaction for request ID: ${req.id} has ${confirmations} confirmations.`,
        );
        if (confirmations > this.confirmationLimit) {
          this.logger.debug(
            `Transaction for request ID: ${req.id} confirmed. Marking as paid.`,
          );

          await this.accountantAction.updateUserRequestPaymentInfo(
            req.id,
            'paid',
            req.numberOfTries,
          );
        }
        return;
      }

      if (!isInMempool) {
        this.logger.warn(
          `Transaction for request ID: ${req.id} not in mempool. Resubmitting...`,
        );
        const newTransactionId = await this.nodeModel.submitTransactionBytes(
          req.txSerialized,
        );
        this.logger.debug(
          `Transaction resubmitted for request ID: ${req.id}. New Transaction ID: ${newTransactionId}`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error while processing submitted request ID: ${req.id}. ${error.message}`,
        );
      }
      if (error instanceof DoubleSpendError) return;
      await this.accountantAction.updateUserRequestPaymentInfo(
        req.id,
        'pending',
        req.numberOfTries,
      );
    }
  };
}

export { Accountant };
