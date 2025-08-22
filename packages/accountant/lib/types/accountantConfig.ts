import { AccountantAction } from '@ergo-faucet/database';
import { Network } from '@fleet-sdk/common';
import { Wallet, NodeModel } from '@ergo-faucet/ergo-utils';

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
