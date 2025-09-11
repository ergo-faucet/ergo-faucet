import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { ergoUtilsConfig } from '@configs';
import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupErgoUtils = async () => {
  const ergoUtilsLogger =
    CallbackLoggerFactory.getInstance().getLogger('ErgoUtils');

  await NodeModel.initialize(
    ergoUtilsConfig.nodeUrl,
    ergoUtilsConfig.timeout,
    ergoUtilsLogger,
  );
  logger.info('NodeModel initialized successfully');

  await Wallet.initialize(
    ergoUtilsConfig.mnemonic,
    ergoUtilsConfig.network,
    ergoUtilsLogger,
  );
  logger.info('Wallet initialized successfully');

  logger.info('ErgoUtils initialized successfully');
};
