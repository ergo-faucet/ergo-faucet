import { ergoConfig } from '@configs';
import { NodeModel, Wallet } from '@ergo-faucet/ergo-utils';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupErgoUtils = async () => {
  const ergoUtilsLogger = DefaultLogger.getInstance().child('ErgoUtils');

  await NodeModel.initialize(
    ergoConfig.nodeUrl,
    ergoConfig.timeout,
    ergoUtilsLogger,
  );

  await Wallet.initialize(ergoConfig, ergoUtilsLogger);

  logger.info('ErgoUtils initialized successfully');
};
