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
import { DoubleSpendError } from './types';

class Accountant {
  private static instance: Accountant;
  private readonly logger: AbstractLogger;
  private readonly tryLimit: number;
  private readonly network: Network;
  private readonly accountantAction: AccountantAction;
  private readonly nodeModel: NodeModel;
  private readonly wallet: Wallet;
  private readonly minNanoErg: bigint;
  private readonly minFee: bigint;
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
    this.nodeModel = config.nodeModel;
    this.wallet = config.wallet;

    this.logger.debug(`Accountant initialized with network: ${this.network}`);
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
   * Processes all unpaid user requests.
   * Handles requests based on their status ('pending' or 'submitted').
   * @returns {Promise<void>}
   */
  public processUserRequests = async (): Promise<void> => {
    try {
      const requests = await this.accountantAction.getUnpaidRequests();
      this.logger.debug(`Found ${requests.length} user requests to process.`);

      for (const r of requests) {
        switch (r.status) {
          case 'pending':
            await this.handlePendingRequest(r);
            break;
          case 'submitted':
            await this.handleSubmittedRequest(r);
            break;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('Error during processUserRequests', {
          message: error.message,
          stack: error.stack,
        });
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
    this.logger.debug(`Processing pending request with ID: ${req.id}`);
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

      const { serializedTx, transactionId } = await this.sendTx(req);

      await this.accountantAction.updateUserRequestPaymentInfo(
        req.id,
        'submitted',
        req.numberOfTries + 1,
        serializedTx,
        transactionId,
      );
    } catch (error) {
      if (error instanceof DoubleSpendError) return;

      if (error instanceof Error)
        this.logger.error(
          `Error during handlePendingRequest for request ID: ${req.id}, package ID: ${req.package.id}`,
          {
            message: error.message,
            stack: error.stack,
          },
        );

      if (error instanceof NotEnoughAssetsError) {
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
    this.logger.debug(`Processing submitted request with ID: ${req.id}`);
    try {
      if (!req.txSerialized || !req.txId) {
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

      const isInMempool = await this.nodeModel.isTxInMempool(transactionId);
      const isMined = await this.nodeModel.isTxMined(transactionId);

      if (isMined) {
        if (req.creationHeight == undefined) {
          req.creationHeight = await this.nodeModel.getInclusionHeight(
            req.txId,
          );
          this.accountantAction.updateCreationHeight(
            req.id,
            req.creationHeight,
          );
        }
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
        if (error instanceof DoubleSpendError) return;

        this.logger.error(
          `Error during handleSubmittedRequest request ID: ${req.id}.`,
          {
            message: error.message,
            stack: error.stack,
          },
        );
      }

      await this.accountantAction.updateUserRequestPaymentInfo(
        req.id,
        'pending',
        req.numberOfTries,
      );
    }
  };

  public sendTx = async (
    request: UserRequest,
  ): Promise<{
    serializedTx: string;
    transactionId: string;
  }> => {
    switch (request.package.type) {
      case 'normal': {
        // Asume we have maximum one ERG asset in normal packages
        const ergAsset = request.package.assets.find(
          (a) => a.tokenId === 'ERG',
        );
        request.package.assets = request.package.assets.filter(
          (a) => a.tokenId != 'ERG',
        );

        const outputBoxAmount = ergAsset ? ergAsset.amount : this.minNanoErg;

        // Select input boxes
        this.logger.debug(
          `Selecting input boxes for request ID: ${request.id}`,
        );
        const inputs = await this.wallet.selectBoxes(
          BigInt(this.minFee + this.minNanoErg + outputBoxAmount),
          request.package.assets,
        );

        // Generate unsigned transaction
        const currentHeight = await this.nodeModel.getCurrentBlockchainHeight();
        this.logger.debug(
          `Current blockchain height: ${currentHeight}. Building transaction for request ID: ${request.id}`,
        );

        const unsignedTx: ErgoUnsignedTransaction = new TransactionBuilder(
          currentHeight,
        )
          .from(inputs)
          .to(
            new OutputBuilder(
              outputBoxAmount,
              request.destinationAddress,
            ).addTokens(request.package.assets),
          )
          .sendChangeTo(this.wallet.getWalletAddress())
          .payFee(this.minFee)
          .build();

        // Sign transaction
        this.logger.debug(`Signing transaction for request ID: ${request.id}`);
        const signedTx = this.wallet.signTransaction(unsignedTx);
        const serializedTx = hex.encode(
          serializeTransaction(signedTx).toBytes(),
        );

        // Submit transaction to the network
        this.logger.debug(
          `Submitting transaction for request ID: ${request.id}`,
        );
        const transactionId =
          await this.nodeModel.submitTransactionBytes(serializedTx);

        this.logger.debug(
          `Transaction submitted successfully for request ID: ${request.id}. Transaction ID: ${transactionId}`,
        );
        return { serializedTx, transactionId };
      }
      case 'random': {
        // what to do?
        return { serializedTx: '', transactionId: '' };
      }
    }
  };
}

export { Accountant };
