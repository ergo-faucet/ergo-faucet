import { Wallet, NodeModel } from '@ergo-faucet/ergo-utils';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

export interface PaymentAuthConfig {
  wallet: Wallet;
  nodeModel: NodeModel;
  fastifyServer: FastifyAPIServer;
}
