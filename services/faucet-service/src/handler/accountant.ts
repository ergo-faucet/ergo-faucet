import { Accountant } from '@ergo-faucet/accountant';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { accountantConfig } from '@configs';
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupAccountant = async () => {
  const accountantLogger =
    CallbackLoggerFactory.getInstance().getLogger('Accountant');

  await Accountant.initialize(accountantConfig, accountantLogger);
  logger.info('Accountant initialized successfully');
};
