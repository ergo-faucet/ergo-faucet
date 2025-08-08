import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Wallet } from '../lib';
import { NotEnoughAssetsError } from '../lib';
import { mockBoxes } from './boxes.data';
import { NodeModel } from '../lib';
import { Network } from '@fleet-sdk/common';

describe('Wallet - selectBoxes', () => {
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
    await NodeModel.initialize('nodeUrl');
    await Wallet.initialize(mnemonic, Network.Testnet);
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
