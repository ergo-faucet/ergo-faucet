import { accountantConfig, ergoConfig } from '@configs';
import { Accountant } from '@ergo-faucet/accountant';
import { AccountantAction } from '@ergo-faucet/database';
import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupAccountant = async () => {
  const accountantLogger = DefaultLogger.getInstance().child('Accountant');

  const accountantAction = AccountantAction.getInstance();

  const nodeModel = NodeModel.getInstance();

  const wallet = Wallet.getInstance();

  await Accountant.initialize(
    { accountantAction, nodeModel, wallet, ...accountantConfig, ...ergoConfig },
    accountantLogger,
  );
  logger.info('Accountant initialized successfully');
};
