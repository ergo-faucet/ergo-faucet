import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotEnoughAssetsError,
  DoubleSpendError,
} from '@ergo-faucet/ergo-utils';
import { Accountant } from '../lib';
import { Asset, UserRequest } from '@ergo-faucet/database';
import {
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { SignedTransaction } from '@fleet-sdk/common';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { hex } from '@fleet-sdk/crypto';
import { serializeTransaction } from '@fleet-sdk/serializer';

import {
  mockNodeModel,
  mockWallet,
  mockAccountantAction,
  mockedConfig,
  mockUserRequest,
} from './mockUtils';
import { mockInput } from './boxes.data';
/**
 * Test suite for Accountant class
 * @target Accountant
 * @description
 * - Covers user request processing, pending/submitted request handling, and error scenarios.
 */
describe('Accountant', () => {
  let accountant: Accountant;
  let mockLogger: AbstractLogger;

  vi.mock('../lib/NodeModel', () => ({
    NodeModel: {
      initialize: vi.fn(),
      getInstance: vi.fn(),
    },
  }));

  vi.mock('../lib/Wallet', () => ({
    Wallet: {
      initialize: vi.fn(),
      getInstance: vi.fn(),
    },
  }));

  /**
   * Setup mocks and Accountant singleton before each test
   */
  beforeEach(() => {
    mockLogger = new DummyLogger();
    mockedConfig.accountantAction = mockAccountantAction;

    Accountant.initialize(mockedConfig, mockLogger);
    accountant = Accountant.getInstance();
  });

  /**
   * Reset Accountant singleton and clear mocks after each test
   */
  afterEach(() => {
    // Reset singleton
    // eslint-disable-next-line
    (Accountant as any).instance = undefined;
    vi.clearAllMocks();
  });

  /**
   * Test for processing user requests
   * @target Accountant.processUserRequests
   * @scenario
   * - Should call appropriate handlers for pending and submitted requests
   * @expected
   * - handlePendingRequest called for pending
   * - handleSubmittedRequest called for submitted
   */
  describe('processUserRequests', () => {
    it('should process pending and submitted requests', async () => {
      const pendingRequest = {
        ...mockUserRequest,
        id: 1,
        status: 'pending' as const,
      };
      const submittedRequest = {
        ...mockUserRequest,
        id: 2,
        status: 'submitted' as const,
      };
      mockAccountantAction.getUnpaidRequests.mockResolvedValue([
        submittedRequest,
        pendingRequest,
      ]);

      const handlePendingSpy = vi.spyOn(accountant, 'handlePendingRequest');
      const handleSubmittedSpy = vi.spyOn(accountant, 'handleSubmittedRequest');

      await accountant.processUserRequests();

      expect(mockAccountantAction.getUnpaidRequests).toHaveBeenCalled();
      expect(handlePendingSpy).toHaveBeenCalledWith(pendingRequest);
      expect(handleSubmittedSpy).toHaveBeenCalledWith(submittedRequest);
    });
  });

  /**
   * Test for handling pending user requests
   * @target Accountant.handlePendingRequest
   * @description
   * - Covers successful transaction submission, try limit exceeded, and asset errors.
   */
  describe('handlePendingRequest', () => {
    /**
     * Test for successful pending request processing
     * @scenario
     * - Selects boxes, builds and signs transaction, submits, updates request
     * @expected
     * - All steps called and request updated to 'submitted'
     */
    it('should process a pending request and submit a transaction', async () => {
      const request = mockUserRequest;
      request.package.assets = [
        {
          amount: 100n,
          tokenId:
            '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
        } as Asset,
      ];

      const currentHeight = 1000;

      // Build unsigned transaction
      const unsignedTx: ErgoUnsignedTransaction = new TransactionBuilder(
        currentHeight,
      )
        .from(mockInput)
        .to(
          new OutputBuilder(
            mockedConfig.minNanoErg.toString(),
            request.destinationAddress,
          ).addTokens(request.package.assets),
        )
        .sendChangeTo(mockWallet.getWalletAddress())
        .payFee(mockedConfig.minFee.toString())
        .build();

      const signedTx: SignedTransaction = {
        id: 'tx123',
        inputs: [],
        outputs: [],
        dataInputs: [],
      };
      // Mock wallet and node actions
      mockWallet.selectBoxes.mockResolvedValue(mockInput);
      mockNodeModel.getCurrentBlockchainHeight.mockResolvedValue(currentHeight);
      mockWallet.signTransaction.mockReturnValue(signedTx);
      mockNodeModel.submitTransactionBytes.mockResolvedValue('tx123');

      await accountant.handlePendingRequest(request);

      expect(mockWallet.selectBoxes).toHaveBeenCalledWith(
        BigInt(mockedConfig.minFee + mockedConfig.minNanoErg),
        request.package.assets,
      );
      const serializedTx = hex.encode(serializeTransaction(signedTx).toBytes());
      expect(mockNodeModel.getCurrentBlockchainHeight).toHaveBeenCalled();
      expect(mockWallet.signTransaction).toHaveBeenCalledWith(unsignedTx);
      expect(mockNodeModel.submitTransactionBytes).toHaveBeenCalledWith(
        serializedTx,
      );
      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).toHaveBeenCalledWith(
        request.id,
        'submitted',
        request.numberOfTries + 1,
        serializedTx,
        'tx123',
      );
    });

    /**
     * Test for exceeding try limit
     * @scenario
     * - Request numberOfTries exceeds limit
     * @expected
     * - Request marked as 'failed', no transaction attempted
     */
    it('should mark request as failed if tryLimit is exceeded', async () => {
      const failedRequest: UserRequest = {
        ...mockUserRequest,
        numberOfTries: 4,
      };

      await accountant.handlePendingRequest(failedRequest);

      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).toHaveBeenCalledWith(
        failedRequest.id,
        'failed',
        failedRequest.numberOfTries,
      );
      expect(mockWallet.selectBoxes).not.toHaveBeenCalled();
    });

    /**
     * Test for NotEnoughAssetsError handling
     * @scenario
     * - Wallet.selectBoxes throws NotEnoughAssetsError
     * @expected
     * - Request stays 'pending', numberOfTries incremented
     */
    it('should handle NotEnoughAssetsError', async () => {
      mockWallet.selectBoxes.mockRejectedValue(
        new NotEnoughAssetsError('Not enough ERG/tokens.'),
      );

      await accountant.handlePendingRequest(mockUserRequest);

      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).toHaveBeenCalledWith(
        mockUserRequest.id,
        'pending',
        mockUserRequest.numberOfTries + 1,
      );
    });
  });

  /**
   * Test for handling submitted user requests
   * @target Accountant.handleSubmittedRequest
   * @description
   * - Covers paid, resubmission, and missing serialized transaction scenarios.
   */
  describe('handleSubmittedRequest', () => {
    const request: UserRequest = {
      ...mockUserRequest,
      txId: 'tx123' as const,
      txSerialized: 'txSerialized',
    };

    /**
     * Test for marking request as paid
     * @scenario
     * - Transaction is mined and has enough confirmations
     * @expected
     * - Request updated to 'paid'
     */
    it('should mark request as paid if transaction is mined and has enough confirmations', async () => {
      mockNodeModel.isTxMined.mockResolvedValue(true);
      mockNodeModel.isTxInMempool.mockResolvedValue(false);
      mockNodeModel.getCurrentBlockchainHeight.mockResolvedValue(1011); // 11 confirmations

      await accountant.handleSubmittedRequest(request);

      expect(mockNodeModel.isTxMined).toHaveBeenCalledWith('tx123');
      expect(mockNodeModel.getCurrentBlockchainHeight).toHaveBeenCalled();
      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).toHaveBeenCalledWith(request.id, 'paid', request.numberOfTries);
    });

    /**
     * Test for resubmitting transaction
     * @scenario
     * - Transaction not mined and not in mempool
     * @expected
     * - Transaction resubmitted, request not updated
     */
    it('should resubmit transaction if not in mempool', async () => {
      mockNodeModel.isTxMined.mockResolvedValue(false);
      mockNodeModel.isTxInMempool.mockResolvedValue(false);
      mockNodeModel.submitTransactionBytes.mockResolvedValue('tx123');

      await accountant.handleSubmittedRequest(request);

      expect(mockNodeModel.submitTransactionBytes).toHaveBeenCalledWith(
        'txSerialized',
      );
      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).not.toHaveBeenCalled();
    });

    /**
     * Test for missing serialized transaction
     * @scenario
     * - txSerialized is missing in request
     * @expected
     * - Request reverted to 'pending'
     */
    it('should revert to pending if txSerialized is missing', async () => {
      const invalidRequest: UserRequest = mockUserRequest;

      await accountant.handleSubmittedRequest(invalidRequest);

      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).toHaveBeenCalledWith(
        invalidRequest.id,
        'pending',
        invalidRequest.numberOfTries,
      );
    });

    /**
     * Test for handling DoubleSpendError in submitted request
     * @target Accountant.handleSubmittedRequest
     * @scenario
     * - NodeModel.submitTransactionBytes throws DoubleSpendError
     * @expected
     * - Request not updated, error handled silently
     */
    it('should handle DoubleSpendError during transaction resubmission', async () => {
      const request: UserRequest = {
        ...mockUserRequest,
        txId: 'tx123' as const,
        txSerialized: 'txSerialized',
      };

      mockNodeModel.isTxMined.mockResolvedValue(false);
      mockNodeModel.isTxInMempool.mockResolvedValue(false);
      mockNodeModel.submitTransactionBytes.mockRejectedValue(
        new DoubleSpendError('Double spend detected'),
      );

      await accountant.handleSubmittedRequest(request);

      expect(mockNodeModel.submitTransactionBytes).toHaveBeenCalledWith(
        'txSerialized',
      );
      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).not.toHaveBeenCalled();
    });
  });
});
