import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NodeModel, Wallet, NotEnoughAssetsError } from '../lib';
import { mockBoxes } from './boxes.data';
import { Network } from '@fleet-sdk/common';
import {
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';

import { mockUTxO } from '@fleet-sdk/mock-chain';

describe('Wallet', () => {
  describe('selectBoxes', () => {
    /**
     * Test for selecting boxes with enough ERGs and tokens
     * @target selectBoxes function
     * @scenario
     * - Use boxes with sufficient ERGs and tokens
     * - Call the selectBoxes function
     * @expected
     * - It should return the selected boxes
     */

    beforeAll(async () => {
      const mnemonic =
        'steel wet husband avoid surround trial insect stone gauge trick zone dry famous family mechanic';
      await NodeModel.initialize('nodeUrl', 1000);
      await Wallet.initialize({
        mnemonic: mnemonic,
        scriptName: 'truePaymentScript.es',
        network: Network.Testnet,
        minFee: 1000000n,
      });
    });

    afterAll(() => {
      vi.clearAllMocks();

      // eslint-disable-next-line
      (NodeModel as any).instance = undefined;

      // eslint-disable-next-line
      (Wallet as any).instance = undefined;
    });

    it('should select boxes with enough ERGs and tokens', async () => {
      // Mock dependencies
      vi.spyOn(NodeModel.getInstance(), 'getUnspentBoxes').mockResolvedValue(
        mockBoxes,
      );
      vi.spyOn(Wallet.getInstance(), 'getWalletAddress').mockReturnValue(
        '3WxFE2x4KVDYeQyJhKvK912AHHME6wNLBT8p6w7M1KqMp71jCAWc',
      );

      // Call the selectBoxes function
      const selectedBoxes = await Wallet.getInstance().selectBoxes(1500000n, [
        { tokenId: 'token1', amount: 400n },
      ]);

      expect(selectedBoxes).toEqual(mockBoxes); // Both boxes should be selected
    });

    /**
     * Test for throwing NotEnoughAssetsError when tokens meet but ERGs do not
     * @target selectBoxes function
     * @scenario
     * - Mock boxes with sufficient tokens but insufficient ERGs
     * - Call the selectBoxes function
     * @expected
     * - It should throw NotEnoughAssetsError
     */
    it('should throw NotEnoughAssetsError when tokens meet but ERGs do not', async () => {
      // Mocking based on the pagination
      vi.spyOn(NodeModel.getInstance(), 'getUnspentBoxes')
        .mockResolvedValueOnce(mockBoxes)
        .mockResolvedValueOnce([]); // length = 0

      await expect(
        Wallet.getInstance().selectBoxes(4000000n, [
          { tokenId: 'token1', amount: 100n },
        ]),
      ).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * Test for throwing NotEnoughAssetsError when ERGs meet but tokens do not
     * @target selectBoxes function
     * @scenario
     * - Mock boxes with sufficient ERGs but insufficient tokens
     * - Call the selectBoxes function
     * @expected
     * - It should throw NotEnoughAssetsError
     */
    it('should throw NotEnoughAssetsError when ERGs meet but tokens do not', async () => {
      // Mocking based on the pagination
      vi.spyOn(NodeModel.getInstance(), 'getUnspentBoxes')
        .mockResolvedValueOnce(mockBoxes)
        .mockResolvedValueOnce([]); // length = 0

      await expect(
        Wallet.getInstance().selectBoxes(1000000n, [
          { tokenId: 'token1', amount: 500n },
        ]),
      ).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * Test for throwing an error when fetching unspent boxes fails
     * @target selectBoxes function
     * @scenario
     * - Mock the getUnspentBoxes function to throw an error
     * - Call the selectBoxes function
     * @expected
     * - It should throw an error with the message "Failed to fetch unspent boxes"
     */
    it('should throw an error when fetching unspent boxes fails', async () => {
      // Mock the getUnspentBoxes function to throw an error
      vi.spyOn(NodeModel.getInstance(), 'getUnspentBoxes').mockRejectedValue(
        new Error('Failed to fetch unspent boxes'),
      );

      await expect(
        Wallet.getInstance().selectBoxes(1000000n, [
          { tokenId: 'token1', amount: 100n },
        ]),
      ).rejects.toThrow('Failed to fetch unspent boxes');
    });
  });

  describe('generateUniquePaymentAddress', () => {
    beforeAll(async () => {
      const mnemonic =
        'steel wet husband avoid surround trial insect stone gauge trick zone dry famous family mechanic';

      await Wallet.initialize({
        mnemonic,
        scriptName: 'truePaymentScript.es',
        network: Network.Testnet,
        minFee: 1000000n,
      });
    });

    afterAll(() => {
      vi.clearAllMocks();

      // eslint-disable-next-line
      (Wallet as any).instance = undefined;
    });
    /**
     * Test for generateUniquePaymentAddress
     * @target Wallet.generateUniquePaymentAddress
     * @scenario
     * - Initialize wallet and derive a one-time payment address using a counter.
     * - Build an unsigned transaction paying that address and sign it with the wallet.
     * @expected
     * - The signed transaction is produced (not null), proving the address/script can be used for signing.
     */
    it('should generate a unique address usable for signing with faucetPK', () => {
      const counter = 1;
      const oneTimeAddrress =
        Wallet.getInstance().generateUniquePaymentAddress(counter);

      const mockBox = mockUTxO({
        value: 1_000_000_000n,
        ergoTree:
          '0008cd02d7beed9dabd208389f2951cb249aaa98355f9fd930859f9499414b45ed1117a0',
      });
      const unsignedTx: ErgoUnsignedTransaction = new TransactionBuilder(1000)
        .from(mockBox)
        .to(new OutputBuilder(100_000_000n, oneTimeAddrress))
        .sendChangeTo(Wallet.getInstance().getWalletAddress())
        .payFee(1000000n)
        .build();

      const signedTx = Wallet.getInstance().signTransaction(unsignedTx);

      expect(oneTimeAddrress).toBe(
        '2YJy6Lins38M95WtpySLZ7MPHrF61uYFm4RuJiVtqAwGAx4NWoGjxmD5GL3qk1ZkgL3uC2uZtS',
      );
      expect(signedTx).not.toBeNull();
    });
  });
});
