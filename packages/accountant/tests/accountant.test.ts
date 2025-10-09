import { Asset, UserRequest } from '@ergo-faucet/database';
import {
  NotEnoughAssetsError,
  DoubleSpendError,
} from '@ergo-faucet/ergo-utils';
import { SignedTransaction, TokenTargetAmount } from '@fleet-sdk/common';
import {
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { hex } from '@fleet-sdk/crypto';
import { serializeTransaction } from '@fleet-sdk/serializer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { Accountant } from '../lib';
import { mockInput } from './boxes.data';
import {
  mockNodeModel,
  mockWallet,
  mockAccountantAction,
  mockedConfig,
  mockUserRequest,
} from './mockUtils';

/**
 * Test suite for Accountant class
 * @target Accountant
 * @description
 * - Covers user request processing, pending/submitted request handling, and error scenarios.
 */
describe('Accountant', () => {
  let accountant: Accountant;
  let mockLogger: AbstractLogger;

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
          amount: '100',
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

      const targetTokens: TokenTargetAmount<bigint>[] =
        request.package.assets.map((asset) => ({
          tokenId: asset.tokenId,
          amount: BigInt(asset.amount),
        }));

      await accountant.handlePendingRequest(request);

      expect(mockWallet.selectBoxes).toHaveBeenCalledWith(
        BigInt(
          mockedConfig.minFee +
            mockedConfig.minNanoErg +
            mockedConfig.minNanoErg,
        ),
        targetTokens,
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
      mockNodeModel.getInclusionHeight.mockResolvedValue(1000);
      mockNodeModel.isTxInMempool.mockResolvedValue(false);
      mockNodeModel.getCurrentBlockchainHeight.mockResolvedValue(1011); // 11 confirmations

      await accountant.handleSubmittedRequest(request);

      expect(mockNodeModel.getInclusionHeight).toHaveBeenCalledWith('tx123');
      expect(mockNodeModel.getCurrentBlockchainHeight).toHaveBeenCalled();
      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).toHaveBeenCalledWith(
        request.id,
        'paid',
        request.numberOfTries,
        undefined,
        request.txId,
      );
    });

    /**
     * Test for resubmitting transaction
     * @scenario
     * - Transaction not mined and not in mempool
     * @expected
     * - Transaction resubmitted, request not updated
     */
    it('should resubmit transaction if not in mempool', async () => {
      mockNodeModel.getInclusionHeight.mockResolvedValue(-1);
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

      mockNodeModel.getInclusionHeight.mockResolvedValue(-1);
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

  describe('selectRandomAssets', () => {
    let randomSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      randomSpy = vi.spyOn(Math, 'random');
    });

    afterEach(() => {
      randomSpy.mockRestore();
    });

    it('should select all assets with weight 100 and randomly select others up to max_payout', () => {
      const assets: Asset[] = [
        { id: 1, tokenId: 't1', amount: '10', weight: 100 } as Asset,
        { id: 2, tokenId: 't2', amount: '20', weight: 100 } as Asset,
        { id: 3, tokenId: 't3', amount: '30', weight: 50 } as Asset,
        { id: 4, tokenId: 't4', amount: '40', weight: 30 } as Asset,
        { id: 5, tokenId: 't5', amount: '50', weight: 20 } as Asset,
      ];
      const max_payout = 4;

      // Mock random to select asset 3 (id:3) first: r = 0.1 * 100 = 10 < 50 -> pick 3
      // Then select asset 5 (id:5): r = 0.7 * 50 = 35 > 30, 35-30=5 <20 -> pick 5
      randomSpy.mockReturnValueOnce(0.1);
      randomSpy.mockReturnValueOnce(0.7);

      const selected = accountant.selectRandomAssets(assets, max_payout);

      expect(selected).toHaveLength(4);
      expect(selected.map((a) => a.id)).toEqual(
        expect.arrayContaining([1, 2, 3, 5]),
      );
      expect(randomSpy).toHaveBeenCalledTimes(2);
    });

    it('should select all always assets even if exceeding max_payout', () => {
      const assets: Asset[] = [
        { id: 1, tokenId: 't1', amount: '10', weight: 100 } as Asset,
        { id: 2, tokenId: 't2', amount: '20', weight: 100 } as Asset,
        { id: 3, tokenId: 't3', amount: '30', weight: 50 } as Asset,
      ];
      const max_payout = 1;

      // No random calls since remain=0
      const selected = accountant.selectRandomAssets(assets, max_payout);

      expect(selected).toHaveLength(2);
      expect(selected.map((a) => a.id)).toEqual([1, 2]);
      expect(randomSpy).not.toHaveBeenCalled();
    });

    it('should select up to max_payout random assets when no always assets', () => {
      const assets: Asset[] = [
        { id: 1, tokenId: 't1', amount: '10', weight: 40 } as Asset,
        { id: 2, tokenId: 't2', amount: '20', weight: 60 } as Asset,
        { id: 3, tokenId: 't3', amount: '30', weight: 0 } as Asset, // weight 0, should be skipped
      ];
      const max_payout = 1;

      // Total weight 100 (40+60), r=0.3*100=30 <40 -> pick 1
      randomSpy.mockReturnValueOnce(0.3);

      const selected = accountant.selectRandomAssets(assets, max_payout);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe(1);
      expect(randomSpy).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no assets', () => {
      const selected = accountant.selectRandomAssets([], 5);
      expect(selected).toHaveLength(0);
    });

    it('should skip assets with zero weight in random selection', () => {
      const assets: Asset[] = [
        { id: 1, tokenId: 't1', amount: '10', weight: 100 } as Asset,
        { id: 2, tokenId: 't2', amount: '20', weight: 0 } as Asset,
        { id: 3, tokenId: 't3', amount: '30', weight: 0 } as Asset,
      ];
      const max_payout = 3;

      // Only always selected, random total weight=0, no pick
      const selected = accountant.selectRandomAssets(assets, max_payout);

      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe(1);
      expect(randomSpy).not.toHaveBeenCalledOnce(); // Since total=0, chooseWeighted returns undefined
    });
  });
});
