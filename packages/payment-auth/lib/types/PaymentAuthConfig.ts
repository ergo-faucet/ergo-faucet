import { Wallet, NodeModel } from '@ergo-faucet/ergo-utils';

export interface PaymentAuthConfig {
  wallet: Wallet;
  nodeModel: NodeModel;
}
