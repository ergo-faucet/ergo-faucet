import { AccountantAction } from '@ergo-faucet/database';
import { Network } from '@fleet-sdk/common';

export interface AccountantConfig {
  network: Network;
  tryLimit: number;
  accountantAction: AccountantAction;
  mnemonic: string;
  nodeUrl: string;
}
