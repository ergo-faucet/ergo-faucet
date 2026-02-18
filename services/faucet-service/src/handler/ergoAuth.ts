import { ergoAuthConfig, redisConfig, ergoConfig } from '@configs';
import { UserAddressAction } from '@ergo-faucet/database';
import { ErgoAuth } from '@ergo-faucet/ergo-authentication';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupErgoAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const userAddressAction = UserAddressAction.getInstance();
  const ergoAuthLogger = DefaultLogger.getInstance().child('ErgoAuth');

  await ErgoAuth.initialize(
    {
      fastifyServer: fastify,
      userAddressAction: userAddressAction,
      redisConfig: redisConfig,
      challengeExpirySeconds: ergoAuthConfig.challengeExpirySeconds,
      refreshTokenExpirySeconds: ergoAuthConfig.refreshTokenExpirySeconds,
      accessTokenExpirySeconds: ergoAuthConfig.accessTokenExpirySeconds,
      networkType: ergoConfig.network,
    },
    ergoAuthLogger,
  );
  logger.info('ErgoAuth initialized successfully');
};
