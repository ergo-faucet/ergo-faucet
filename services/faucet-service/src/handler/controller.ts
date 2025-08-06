import { ErgoFaucetController } from '@ergo-faucet/controller';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DataSourceHandler } from '@ergo-faucet/database';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupController = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const packageAction =
    DataSourceHandler.getInstance().getActions().packageAction;
  const controllerLogger =
    CallbackLoggerFactory.getInstance().getLogger('Controller');

  await ErgoFaucetController.initialize(
    fastify,
    packageAction,
    controllerLogger,
  );
  logger.info('Controller initialized successfully');
};
