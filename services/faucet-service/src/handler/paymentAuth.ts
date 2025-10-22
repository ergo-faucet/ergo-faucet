import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { paymentAuthConfig } from '@configs';
import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import { PaymentAuth } from '@ergo-faucet/payment-auth';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { PaymentAction } from '@ergo-faucet/database';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupPaymentAuth = async () => {
  const paymentAuthLogger =
    CallbackLoggerFactory.getInstance().getLogger('PaymentAuth');
  const nodeModel = await NodeModel.getInstance();
  const wallet = await Wallet.getInstance();
  const fastifyServer = FastifyAPIServer.getInstance();
  const paymentAction = await PaymentAction.getInstance();

  await PaymentAuth.initialize(
    { nodeModel, wallet, fastifyServer, paymentAction, ...paymentAuthConfig },
    paymentAuthLogger,
  );

  logger.info('PaymentAuth initialized successfully');
};
