import { ErgoFaucetController } from '@ergo-faucet/controller';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { PackageAction } from '@ergo-faucet/database';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { controllerConfig } from '@configs';
import { NodeModel } from '@ergo-faucet/ergo-utils';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupController = async () => {
  const fastify = FastifyAPIServer.getInstance();

  const packageAction = PackageAction.getInstance();
  const controllerLogger =
    CallbackLoggerFactory.getInstance().getLogger('Controller');

  const nodeModel = await NodeModel.getInstance();

  await ErgoFaucetController.initialize(
    fastify,
    packageAction,
    controllerConfig.networkType,
    nodeModel,
    controllerLogger,
  );
  logger.info('Controller initialized successfully');
};
