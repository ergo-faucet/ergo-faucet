import { AccountantAction } from '@ergo-faucet/database';
import { Wallet, NodeModel } from '@ergo-faucet/ergo-utils';
import { Network } from '@fleet-sdk/common';

export interface AccountantConfig {
  nodeModel: NodeModel;
  wallet: Wallet;
  network: Network;
  tryLimit: number;
  accountantAction: AccountantAction;
  minNanoErg: bigint;
  minFee: bigint;
  confirmationLimit: number;
}
