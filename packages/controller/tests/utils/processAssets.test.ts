import {
  InvalidTokenPrecisionError,
  TokenNotFoundError,
} from '@ergo-faucet/ergo-utils';
import { expect, it, describe, vi, beforeEach, afterAll } from 'vitest';

import { toBigIntAmount, processAssets } from '../../lib/utils';
import { mockNodeModel } from '../mockUtils';

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test for converting amounts to BigInt based on token decimals
   * @target toBigIntAmount
   * @scenario
   * - Convert various input amounts (integers, decimals, strings) with specified decimals
   * @expected
   * - Correctly converts amounts to BigInt, handling integer and fractional parts, padding, truncation, and zero cases
   */
  describe('toBigIntAmount', () => {
    it('handles integer values correctly', () => {
      expect(toBigIntAmount(1.0, 9)).toBe(1000000000n);
      expect(toBigIntAmount('123', 2)).toBe(12300n);
    });

    it('handles fractional values with exact decimals', () => {
      expect(toBigIntAmount('1.500', 9)).toBe(1500000000n);
      expect(toBigIntAmount('0.25', 2)).toBe(25n);
    });

    it('pads fractional part if shorter than decimals', () => {
      expect(toBigIntAmount('0.1', 3)).toBe(100n);
      expect(toBigIntAmount('2.45', 4)).toBe(24500n);
    });

    it('truncates fractional part if longer than decimals', () => {
      expect(toBigIntAmount('1.123456789123', 9)).toBe(1123456789n);
    });

    it('handles zero correctly', () => {
      expect(toBigIntAmount(0, 9)).toBe(0n);
      expect(toBigIntAmount('0.000', 5)).toBe(0n);
    });
  });

  describe('processAssets', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    /**
     * Test for successful processing of assets with ERG token
     * @target processAssets
     * @scenario
     * - Process assets with ERG token
     * @expected
     * - Correctly converts ERG amount and returns processed assets
     */
    it('should successfully process ERG token', async () => {
      const assets = [
        { tokenId: 'ERG', amount: '1.5', usageDescription: 'Test ERG' },
      ];

      const result = await processAssets(assets, mockNodeModel);

      expect(result).toEqual([
        {
          tokenId: 'ERG',
          assetName: 'ERG',
          amount: '1500000000',
          decimals: 9,
          usageDescription: 'Test ERG',
        },
      ]);
    });

    /**
     * Test for successful processing of non-ERG token
     * @target processAssets
     * @scenario
     * - Process assets with non-ERG token and valid decimals
     * @expected
     * - Correctly converts amount based on token decimals
     */
    it('should successfully process non-ERG token', async () => {
      mockNodeModel.getTokenById.mockResolvedValue({
        id: 'TOKEN1',
        boxId: 'mock-box-id',
        emissionAmount: 1234,
        name: 'TOKEN1',
        description: 'no description',
        decimals: 2,
      });
      const assets = [
        { tokenId: 'TOKEN1', amount: '100.25', usageDescription: 'Test token' },
      ];

      const result = await processAssets(assets, mockNodeModel);

      expect(mockNodeModel.getTokenById).toHaveBeenCalledWith('TOKEN1');

      expect(result).toEqual([
        {
          tokenId: 'TOKEN1',
          assetName: 'TOKEN1',
          amount: '10025',
          decimals: 2,
          usageDescription: 'Test token',
        },
      ]);
    });

    /**
     * Test for TokenNotFoundError in processAssets
     * @target processAssets
     * @scenario
     * - Process assets with invalid token ID
     * @expected
     * - Throws TokenNotFoundError
     */
    it('should throw TokenNotFoundError for invalid token', async () => {
      mockNodeModel.getTokenById.mockRejectedValue(
        new TokenNotFoundError('Token not found'),
      );
      const assets = [
        {
          tokenId: 'INVALID_TOKEN',
          amount: '100',
          usageDescription: 'Test token',
        },
      ];

      await expect(processAssets(assets, mockNodeModel)).rejects.toThrow(
        TokenNotFoundError,
      );
    });

    /**
     * Test for InvalidTokenPrecisionError in processAssets
     * @target processAssets
     * @scenario
     * - Process assets with amount exceeding token precision
     * @expected
     * - Throws InvalidTokenPrecisionError
     */
    it('should throw InvalidTokenPrecisionError for invalid precision', async () => {
      mockNodeModel.getTokenById.mockResolvedValue({
        id: 'TOKEN1',
        boxId: 'mock-box-id',
        emissionAmount: 1234,
        name: 'TOKEN1',
        description: 'mock-description',
        decimals: 2,
      });
      const assets = [
        {
          tokenId: 'TOKEN1',
          amount: '100.123',
          usageDescription: 'Test token',
        },
      ];

      await expect(processAssets(assets, mockNodeModel)).rejects.toThrow(
        InvalidTokenPrecisionError,
      );
    });
  });
});
