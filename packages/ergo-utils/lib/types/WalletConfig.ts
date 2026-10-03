import { Network } from '@fleet-sdk/common';

export interface WalletConfig {
  network: Network;
  scriptName: string;
  minFee: bigint;
  mnemonic?: string;
  passphrase?: string;
  privateKey?: string;
}
