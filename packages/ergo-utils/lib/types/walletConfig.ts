import { Network } from '@fleet-sdk/common';

export interface WalletConfig {
  network: Network;
  mnemonic?: string;
  passphrase?: string;
  privateKey?: string;
}
