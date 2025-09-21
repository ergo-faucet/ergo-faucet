import { Accountant } from '@ergo-faucet/accountant';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { accountantConfig } from '@configs';
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupAccountant = async () => {
  const accountantLogger =
    CallbackLoggerFactory.getInstance().getLogger('Accountant');

  const accountantAction = AccountantAction.getInstance();

  const nodeModel = NodeModel.getInstance();

  const wallet = Wallet.getInstance();

  await Accountant.initialize(
    { accountantAction, nodeModel, wallet, ...accountantConfig },
    accountantLogger,
  );
  logger.info('Accountant initialized successfully');
};
