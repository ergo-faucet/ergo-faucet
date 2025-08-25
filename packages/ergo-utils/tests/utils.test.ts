import { describe, expect, it } from 'vitest';
import { isValidErgoAddress } from '../lib';
import { Network } from '@fleet-sdk/common';

describe('', async () => {
  /**
   * Test for rejecting a TESTNET address on MAINNET
   * @target ErgoAuth.isvalidErgoAddress
   * @scenario
   * - pass a valid TESTNET address (prefix 0x10) while running on MAINNET
   * @expected
   * - should return false
   */
  it('should reject TESTNET address when running on MAINNET', () => {
    // This is a valid TESTNET prefix address (network byte 0x10)
    const testnetAddress =
      '3WxrAftnTJSGP91VEhRQWYviUG26XQNoPKciqqcBD86VPVS5Zn13';

    let isValid = isValidErgoAddress(testnetAddress, 'mainnet');
    expect(isValid).toBe(false);

    isValid = isValidErgoAddress(testnetAddress, Network.Mainnet);
    expect(isValid).toBe(false);
  });

  /**
   * Test for accepting a valid MAINNET address
   * @target ErgoAuth.isvalidErgoAddress
   * @scenario
   * - pass a valid MAINNET address (prefix 0x00)
   * @expected
   * - should return true
   */
  it('should accept valid MAINNET address', () => {
    const mainnetAddr = '9fq3mgbL6UgzV33dC4R2n8L3CFSrBUytME8JKD8xDKgj8BDTLX7';

    let isValid = isValidErgoAddress(mainnetAddr, 'mainnet');
    expect(isValid).toBe(true);

    isValid = isValidErgoAddress(mainnetAddr, Network.Mainnet);
    expect(isValid).toBe(true);
  });
});
