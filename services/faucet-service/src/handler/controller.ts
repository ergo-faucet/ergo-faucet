import { controllerConfig } from '@configs';
import { ErgoFaucetController } from '@ergo-faucet/controller';
import { PackageAction, RequestHistoryAction } from '@ergo-faucet/database';
import { NodeModel } from '@ergo-faucet/ergo-utils';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupController = async () => {
  const fastify = FastifyAPIServer.getInstance();

  const packageAction = PackageAction.getInstance();
  const requestHistoryAction = RequestHistoryAction.getInstance();
  const controllerLogger = DefaultLogger.getInstance().child('Controller');

  const nodeModel = await NodeModel.getInstance();

  await ErgoFaucetController.initialize(
    fastify,
    packageAction,
    controllerConfig.networkType,
    nodeModel,
    requestHistoryAction,
    controllerLogger,
  );
  logger.info('Controller initialized successfully');
};
