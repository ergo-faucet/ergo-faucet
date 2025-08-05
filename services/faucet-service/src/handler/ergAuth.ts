import { ErgoAuth } from '@ergo-faucet/ergo-authentication';
import { ergoAuthConfig, redisConfig } from '../configs';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DataSourceHandler } from '@ergo-faucet/database';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupErgoAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const userAddressAction =
    DataSourceHandler.getInstance().getActions().userAddressAction;
  const ergoAuthLogger =
    CallbackLoggerFactory.getInstance().getLogger('ErgoAuth');

  await ErgoAuth.initialize(
    {
      fastifyServer: fastify,
      userAddressAction: userAddressAction,
      redisConfig: redisConfig,
      challengeExpirySeconds: ergoAuthConfig.challengeExpirySeconds,
      refreshTokenExpirySeconds: ergoAuthConfig.refreshTokenExpirySeconds,
      accessTokenExpirySeconds: ergoAuthConfig.accessTokenExpirySeconds,
      networkType: ergoAuthConfig.networkType,
    },
    ergoAuthLogger,
  );
  logger.info('ErgoAuth initialized successfully');
};
