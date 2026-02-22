import { AccountantAction, UserRequest } from '@ergo-faucet/database';
import {
  NodeModel,
  Wallet,
  DoubleSpendError,
  NotEnoughAssetsError,
} from '@ergo-faucet/ergo-utils';
import {
  Amount,
  Box,
  Network,
  OneOrMore,
  TokenAmount,
  ensureBigInt,
  TokenTargetAmount,
} from '@fleet-sdk/common';
import {
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { hex } from '@fleet-sdk/crypto';
import { serializeTransaction } from '@fleet-sdk/serializer';

import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { AccountantConfig } from './types';

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
      this.logger.warn('Error during processUserRequests', {
        message: error instanceof Error ? error.message : '',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  /**
   * Handles a user request with a 'pending' status.
   * Attempts to create and submit a transaction for the request.
   * @param request - The user request to process.
   * @returns {Promise<void>}
   */
  public handlePendingRequest = async (request: UserRequest): Promise<void> => {
    this.logger.debug(`Processing pending request with ID: ${request.id}`);
    try {
      if (request.numberOfTries > this.tryLimit) {
        this.logger.debug(
          `Request with ID: ${request.id} exceeded try limit. Marking as failed.`,
        );
        await this.accountantAction.updateUserRequestPaymentInfo(
          request.id,
          'failed',
          request.numberOfTries,
        );
        return;
      }

      const { serializedTx, transactionId } =
        await this.processTransaction(request);
      await this.accountantAction.updateUserRequestPaymentInfo(
        request.id,
        'submitted',
        request.numberOfTries + 1,
        serializedTx,
        transactionId,
      );
    } catch (error) {
      if (error instanceof DoubleSpendError) {
        this.logger.debug(
          `Double spend error during handlePendingRequest with id: ${request.id}`,
        );
      } else if (error instanceof NotEnoughAssetsError) {
        this.logger.debug(
          `Not Enough Assets Error for request with id: ${request.id} , packageId: ${request.package.id}`,
        );

        await this.accountantAction.updateUserRequestPaymentInfo(
          request.id,
          'pending',
          request.numberOfTries + 1,
        );
      } else throw error;
    }
  };

  /**
   * Handles a user request with a 'submitted' status.
   * Checks the transaction status and updates the request accordingly.
   * @param request - The user request to process.
   * @returns {Promise<void>}
   */
  public handleSubmittedRequest = async (
    request: UserRequest,
  ): Promise<void> => {
    this.logger.debug(`Processing submitted request with ID: ${request.id}`);
    try {
      if (!request.txSerialized || !request.txId) {
        this.logger.debug(
          `Request ID: ${request.id} has no serialized transaction. Marking as pending.`,
        );
        await this.accountantAction.updateUserRequestPaymentInfo(
          request.id,
          'pending',
          request.numberOfTries,
        );
        return;
      }

      const transactionId = request.txId!;
      this.logger.debug(
        `Checking transaction status for request ID: ${request.id}, Transaction ID: ${transactionId}`,
      );

      const inclusionHeight = await this.nodeModel.getInclusionHeight(
        request.txId,
      );

      if (inclusionHeight > 0) {
        if (request.creationHeight == undefined) {
          request.creationHeight = inclusionHeight;
          await this.accountantAction.updateCreationHeight(
            request.id,
            inclusionHeight,
          );
        }
        const currentHeight = await this.nodeModel.getCurrentBlockchainHeight();

        const confirmations = currentHeight - request.creationHeight!;
        this.logger.debug(
          `Transaction for request ID: ${request.id} has ${confirmations} confirmations.`,
        );
        if (confirmations > this.confirmationLimit) {
          this.logger.debug(
            `Transaction for request ID: ${request.id} confirmed. Marking as paid.`,
          );

          await this.accountantAction.updateUserRequestPaymentInfo(
            request.id,
            'paid',
            request.numberOfTries,
            undefined,
            request.txId,
          );
        }
        return;
      }
      const isInMempool = await this.nodeModel.isTxInMempool(transactionId);

      if (!isInMempool) {
        this.logger.debug(
          `Transaction for request ID: ${request.id} not in mempool. Resubmitting...`,
        );
        const transactionId = await this.nodeModel.submitTransactionBytes(
          request.txSerialized,
        );
        this.logger.debug(
          `Transaction resubmitted for request ID: ${request.id}. Transaction ID: ${transactionId}`,
        );
      } else {
        this.logger.debug(`Transaction is in mempool`);
      }
    } catch (error) {
      if (error instanceof DoubleSpendError) {
        this.logger.debug(
          `Double spend error during handlePendingRequest with id: ${request.id}`,
        );
      } else {
        await this.accountantAction.updateUserRequestPaymentInfo(
          request.id,
          'pending',
          request.numberOfTries,
        );
        throw error;
      }
    }
  };

  /**
   * Builds, signs, and submits an Ergo transaction based on the given request.
   *
   * For `normal` packages:
   *  - Selects input boxes, builds and signs a transaction, then submits it.
   * For `random` packages: returns empty transaction data (not implemented).
   *
   * @param request - User request with package details and destination.
   * @returns Promise with the serialized transaction and transaction ID.
   */
  public processTransaction = async (
    request: UserRequest,
  ): Promise<{
    serializedTx: string;
    transactionId: string;
  }> => {
    switch (request.package.type) {
      case 'normal': {
        // Assume we have maximum one ERG asset in normal packages
        const ergAsset = request.package.assets.find(
          (a) => a.tokenId === 'ERG',
        );
        request.package.assets = request.package.assets.filter(
          (a) => a.tokenId != 'ERG',
        );

        const outputBoxAmount = ergAsset ? ergAsset.amount : this.minNanoErg;

        const tokens: OneOrMore<TokenAmount<Amount>> =
          request.package.assets.map((asset) => ({
            tokenId: asset.tokenId,
            amount: ensureBigInt(asset.amount),
          }));

        const targetTokens: TokenTargetAmount<bigint>[] =
          request.package.assets.map((asset) => ({
            tokenId: asset.tokenId,
            amount: BigInt(asset.amount),
          }));

        // Select input boxes
        this.logger.debug(
          `Selecting input boxes for request ID: ${request.id}`,
        );
        const inputs: Box<bigint>[] = await this.wallet.selectBoxes(
          this.minFee + this.minNanoErg + BigInt(outputBoxAmount),
          targetTokens,
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
            ).addTokens(tokens),
          )
          .sendChangeTo(this.wallet.getWalletAddress())
          .payFee(this.minFee)
          .build();

        // Sign transaction
        this.logger.debug(
          `Signing transaction for request ID: ${request.id}, transaction: ${JSON.stringify(unsignedTx.toEIP12Object())} `,
        );

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
        this.logger.info('Currently there is no support for random packages');
        return { serializedTx: '', transactionId: '' };
      }
    }
  };
}

export { Accountant };
