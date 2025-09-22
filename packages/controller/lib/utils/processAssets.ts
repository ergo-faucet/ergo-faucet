import { AssetPayload } from '@ergo-faucet/database';
import { Static } from '@sinclair/typebox';
import { UserProvidedAsset } from '../types';
import { validateAmountPrecision } from '@ergo-faucet/ergo-utils';
import { NodeModel } from '@ergo-faucet/ergo-utils';

/**
 * Converts a decimal string or number into a BigInt representation
 * normalized to the given number of decimals.
 *
 * @param value    Input amount as string or number (may contain decimals).
 * @param decimals Number of decimal places the token uses.
 * @returns  {bigint}      BigInt representing the scaled integer value.
 */
export const toBigIntAmount = (
  value: string | number,
  decimals: number,
): bigint => {
  const [intPart, fracPart = ''] = String(value).split('.');

  // pad fractional part to match decimals
  const fracPadded = fracPart.padEnd(decimals, '0');

  // cut off anything beyond allowed decimals
  const normalized = intPart + fracPadded.slice(0, decimals);

  return BigInt(normalized);
};

/**
 * Converts and validates user-provided asset data for package creation.
 * Adjusts asset amounts to blockchain precision using token decimals, and sets asset names and descriptions.
 * Handles both native ERG and custom tokens.
 *
 * @param assets - Array of asset objects with tokenId, amount, and usageDescription.
 * @param nodeModel - NodeModel instance for fetching token metadata.
 * @returns {Promise<AssetPayload[]>} Array of normalized asset payloads.
 */
export const processAssets = async (
  assets: Static<typeof UserProvidedAsset>[],
  nodeModel: NodeModel,
): Promise<AssetPayload[]> => {
  const tokens: AssetPayload[] = [];
  for (let i = 0; i < assets.length; i++) {
    const { tokenId, amount: value, usageDescription } = assets[i];

    // Special case for native ERG token
    if (tokenId === 'ERG') {
      const ergDecimals = 9;

      const amount = toBigIntAmount(value, ergDecimals).toString();

      tokens.push({
        tokenId,
        assetName: 'ERG',
        amount,
        decimals: 9,
        usageDescription: usageDescription
          ? usageDescription
          : 'no description',
      });
      continue;
    }

    // Fetch token decimals
    const { decimals, description, name } =
      await nodeModel.getTokenById(tokenId);

    // Validate the amount's precision against the token's decimals
    validateAmountPrecision(Number(value), decimals);

    // convert user provided amount to nodeAPI requested amount and save it to the list
    const amount = toBigIntAmount(value, decimals).toString();
    tokens.push({
      tokenId,
      assetName: name,
      amount,
      decimals: decimals,
      usageDescription: usageDescription ? usageDescription : description,
    });
  }

  return tokens;
};
