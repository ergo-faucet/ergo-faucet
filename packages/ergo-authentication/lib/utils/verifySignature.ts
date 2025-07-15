import { hex } from '@fleet-sdk/crypto';
import { ErgoAddress, ErgoMessage } from '@fleet-sdk/core';
import { Prover } from '@fleet-sdk/wallet';
import { VerifySignatureParams } from '../types';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

/**
 * Verifies a signed Ergo message using a public key derived from an Ergo address.
 * @param address - The Ergo address to verify against.
 * @param signedMessage - The signed message in base58 format.
 * @param proof - The signature proof in hex format.
 * @param logger - Optional logger for debugging (default: DummyLogger).
 * @returns `true` if signature is valid, otherwise `false`
 */
export const verifySignature = ({
  address,
  signedMessage,
  proof,
  logger = new DummyLogger(),
}: VerifySignatureParams & { logger?: AbstractLogger }): boolean => {
  try {
    const message = ErgoMessage.fromData(signedMessage);
    const [publicKey] = ErgoAddress.fromBase58(address).getPublicKeys();
    const proofBytes = hex.decode(proof);
    const prover = new Prover();
    return prover.verify(message, proofBytes, publicKey);
  } catch (err) {
    logger.error(
      `[verifySignature] Error verifying signature: ${(err as Error).message}`,
    );
    return false;
  }
};
