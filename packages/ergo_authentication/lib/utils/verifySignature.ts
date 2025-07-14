import { hex } from '@fleet-sdk/crypto';
import { ErgoAddress, ErgoMessage } from '@fleet-sdk/core';
import { Prover } from '@fleet-sdk/wallet';
import { VerifySignatureParams } from '../types';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

/**
 * Verifies a signed Ergo message using a public key derived from an Ergo address.
 * @param params - Object containing address, signedMessage, proof, and optionally logger.
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
