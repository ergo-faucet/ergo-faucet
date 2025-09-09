import { ErgoFaucetController } from '@ergo-faucet/controller';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { PackageAction, RequestHistoryAction } from '@ergo-faucet/database';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { controllerConfig } from '@configs';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupController = async () => {
  const fastify = FastifyAPIServer.getInstance();

  const packageAction = PackageAction.getInstance();
  const requestHistoryAction = RequestHistoryAction.getInstance();
  const controllerLogger =
    CallbackLoggerFactory.getInstance().getLogger('Controller');

  await ErgoFaucetController.initialize(
    fastify,
    packageAction,
    controllerConfig.networkType,
    requestHistoryAction,
    controllerLogger,
  );
  logger.info('Controller initialized successfully');
};
