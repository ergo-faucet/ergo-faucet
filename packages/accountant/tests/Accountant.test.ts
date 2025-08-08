import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Accountant } from '../lib';
import { NodeModel } from '../lib';
import { Wallet } from '../lib';
import { Asset, UserRequest } from '@ergo-faucet/database';
import {
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { NotEnoughAssetsError } from '../lib/types';
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
import { mockUTxO } from '@fleet-sdk/mock-chain';
import { ErgoHDKey, generateMnemonic } from '@fleet-sdk/wallet';

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

  beforeEach(() => {
    // Mock logger
    mockLogger = new DummyLogger();
    vi.mocked(NodeModel.getInstance).mockReturnValue(mockNodeModel);
    vi.mocked(Wallet.getInstance).mockReturnValue(mockWallet);
    mockedConfig.accountantAction = mockAccountantAction;

    // Initialize Accountant
    Accountant.initialize(mockedConfig, mockLogger);
    accountant = Accountant.getInstance();
  });

  afterEach(() => {
    // Reset singleton
    // eslint-disable-next-line
    (Accountant as any).instance = undefined;
    vi.clearAllMocks();
  });

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

  describe('handlePendingRequest', () => {
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

      const rootKey = await ErgoHDKey.fromMnemonic(generateMnemonic());

      // mock inputs
      const input = mockUTxO({
        value: 1_000_000_000n,
        ergoTree: rootKey.address.ergoTree,
        assets: [
          {
            amount: 100n,
            tokenId:
              '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
          },
        ],
      });

      const unsignedTx: ErgoUnsignedTransaction = new TransactionBuilder(
        currentHeight,
      )
        .from(input)
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

      mockWallet.selectBoxes.mockResolvedValue(input);
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

    it('should handle NotEnoughAssetsError', async () => {
      const errorSpy = vi.spyOn(mockLogger, 'error');
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
      expect(errorSpy).toHaveBeenCalledWith(
        'Not Enough Assets error : Not enough ERG/tokens.',
      );
    });
  });

  describe('handleSubmittedRequest', () => {
    const request: UserRequest = {
      ...mockUserRequest,
      txId: 'tx123' as const,
      txSerialized: 'txSerialized',
    };
    it('should mark request as paid if transaction is mined and has enough confirmations', async () => {
      mockNodeModel.isTransactionMined.mockResolvedValue(true);
      mockNodeModel.isTransactionInMempool.mockResolvedValue(false);
      mockNodeModel.getCurrentBlockchainHeight.mockResolvedValue(1011); // 11 confirmations

      await accountant.handleSubmittedRequest(request);

      // Assert
      expect(mockNodeModel.isTransactionMined).toHaveBeenCalledWith('tx123');
      expect(mockNodeModel.getCurrentBlockchainHeight).toHaveBeenCalled();
      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).toHaveBeenCalledWith(request.id, 'paid', request.numberOfTries);
    });

    it('should resubmit transaction if not in mempool', async () => {
      mockNodeModel.isTransactionMined.mockResolvedValue(false);
      mockNodeModel.isTransactionInMempool.mockResolvedValue(false);
      mockNodeModel.submitTransactionBytes.mockResolvedValue('tx123');

      await accountant.handleSubmittedRequest(request);

      expect(mockNodeModel.submitTransactionBytes).toHaveBeenCalledWith(
        'txSerialized',
      );
      expect(
        mockAccountantAction.updateUserRequestPaymentInfo,
      ).not.toHaveBeenCalled();
    });

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
  });
});
