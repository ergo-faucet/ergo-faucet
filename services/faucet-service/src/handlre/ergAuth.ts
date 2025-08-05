import { ErgoAuth } from '@ergo-faucet/ergo-authentication';
import { ergoAuthConfig, redisConfig } from '../configs';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DataSourceHandler } from '@ergo-faucet/database';

export const setupErgoAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const userAddressAction =
    DataSourceHandler.getInstance().getActions().userAddressAction;

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
    // Logger instance
  );
};
