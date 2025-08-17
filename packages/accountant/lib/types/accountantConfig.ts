import { AccountantAction } from '@ergo-faucet/database';
import { Network } from '@fleet-sdk/common';
import { NodeModel } from '../NodeModel';
import { Wallet } from '../Wallet';

export interface AccountantConfig {
  nodeModel: NodeModel;
  wallet: Wallet;
  network: Network;
  tryLimit: number;
  accountantAction: AccountantAction;
  mnemonic: string;
  nodeUrl: string;
  minNanoErg: bigint;
  minFee: bigint;
  confirmationLimit: number;
}
