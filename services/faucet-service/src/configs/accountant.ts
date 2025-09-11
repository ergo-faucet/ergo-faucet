import { AccountantConfig } from '@ergo-faucet/accountant';
import { AccountantAction } from '@ergo-faucet/database';
import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import config from 'config';

/**
 * Accountant configuration
 */
export const accountantConfig: AccountantConfig = {
  accountantAction: AccountantAction.getInstance(),
  nodeModel: NodeModel.getInstance(),
  wallet: Wallet.getInstance(),
  network:
    config.get<string>('ergo.network').toLowerCase() === 'mainnet' ? 0 : 16,
  minFee: config.get<bigint>('ergo.minFee'),
  minNanoErg: config.get<bigint>('ergo.minNanoErg'),
  tryLimit: config.get<number>('accountant.tryLimit'),
  confirmationLimit: config.get<number>('ergo.confirmationLimit'),
};
