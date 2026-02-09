import { ensureDefaults, Network, SignedTransaction } from '@fleet-sdk/common';
import type { ErgoUnsignedTransaction } from '@fleet-sdk/core';
import { bigintBE, hex } from '@fleet-sdk/crypto';
import { mockBlockchainStateContext } from '@fleet-sdk/mock-chain';
import type { ErgoHDKey } from '@fleet-sdk/wallet';
import { type BlockchainParameters, ProverBuilder$ } from 'sigmastate-js/main';
import { ExecutionParameters, TransactionExecutionResult } from './types';

/**
 * blockchain parameters at height 1283632
 */
export const BLOCKCHAIN_PARAMETERS: BlockchainParameters = {
  storageFeeFactor: 1250000,
  minValuePerByte: 360,
  maxBlockSize: 1271009,
  tokenAccessCost: 100,
  inputCost: 2407,
  dataInputCost: 100,
  outputCost: 197,
  maxBlockCost: 8001091,
  blockVersion: 3,
  softForkStartingHeight: undefined,
  softForkVotesCollected: undefined,
};

/**
 * sign transaction which their inputs include script guard
 * @param unsigned
 * @param keys
 * @param parameters
 * @returns
 */
export const execute = (
  unsigned: ErgoUnsignedTransaction,
  keys: ErgoHDKey[],
  parameters: ExecutionParameters,
): SignedTransaction | TransactionExecutionResult => {
  for (const key of keys) {
    if (!key.hasPrivateKey()) {
      throw new Error(
        `ErgoHDKey '${hex.encode(key.publicKey)}' must have a private key.`,
      );
    }
  }

  const eip12Tx = unsigned.toEIP12Object();

  const params = ensureDefaults(parameters, {
    parameters: BLOCKCHAIN_PARAMETERS,
    context: mockBlockchainStateContext(),
    Network: Network.Testnet,
    baseCost: 0,
  });

  try {
    const builder = ProverBuilder$.create(params.parameters, params.Network);
    for (const key of keys) {
      builder.withDLogSecret(bigintBE.encode(key.privateKey as Uint8Array));
    }
    const prover = builder.build();

    const reducedTx = prover.reduce(
      params.context,
      eip12Tx,
      eip12Tx.inputs,
      eip12Tx.dataInputs,
      unsigned.burning.tokens,
      params.baseCost,
    );

    return prover.signReduced(reducedTx, undefined);
  } catch (err) {
    return { success: false, reason: (err as Error).message };
  }
};
