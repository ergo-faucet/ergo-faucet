import { Network } from '@fleet-sdk/common';
import { ErgoAddress } from '@fleet-sdk/core';

import { InvalidTokenPrecisionError } from '../types';

/**
 * Validates the precision of the provided amount against the token's decimals.
 * @param amount - The amount to validate.
 * @param tokenDecimals - The allowed decimal precision for the token.
 * @throws Error if the amount exceeds the allowed precision.
 */
export const validateAmountPrecision = (
  amount: string,
  tokenDecimals: number,
): void => {
  const amountDecimalPlaces = amount.split('.')[1]?.length || 0;
  if (amountDecimalPlaces > tokenDecimals) {
    const errorMessage = `Amount has too many decimal places. Token supports up to ${tokenDecimals} decimal places, but received ${amountDecimalPlaces}.`;
    throw new InvalidTokenPrecisionError(errorMessage);
  }
};

/**
 * Validates if the provided Ergo address is valid for the configured network.
 * @param address - The Ergo address to validate.
 * @returns `true` if valid, otherwise `false`.
 */
export const isValidErgoAddress = (
  address: string,
  networkType: Network,
): boolean => {
  try {
    const network = ErgoAddress.fromBase58(address).network;
    return networkType === network;
  } catch {
    return false;
  }
};
