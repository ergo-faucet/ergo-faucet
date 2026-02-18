import { xAuthConfig, redisConfig } from '@configs';
import { XAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { XAuth } from '@ergo-faucet/x-auth';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupXAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const xAction = XAction.getInstance();
  const xAuthLogger = DefaultLogger.getInstance().child('XAuth');

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
      frontBaseURL: xAuthConfig.frontBaseURL,
    },
    xAuthLogger,
  );
  logger.info('XAuth initialized successfully');
};
