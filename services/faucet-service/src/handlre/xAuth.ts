import { XAuth } from '@ergo-faucet/x-auth';
import { xAuthConfig, redisConfig } from '../configs';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DataSourceHandler } from '@ergo-faucet/database';

export const setupXAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const xAction = DataSourceHandler.getInstance().getActions().xAction;

  await XAuth.initialize(
    {
      fastifyServer: fastify,
      xAction: xAction,
      redis: redisConfig,
      clientID: xAuthConfig.clientID,
      clientSecret: xAuthConfig.clientSecret,
      redirectURL: xAuthConfig.redirectURL,
      scope: xAuthConfig.scope,
      expiresTime: xAuthConfig.expiresTime,
      sessionTTL: xAuthConfig.sessionTTL,
    },
    // Logger instance
  );

  return XAuth.getInstance();
};
