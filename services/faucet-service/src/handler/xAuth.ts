import { XAuth } from '@ergo-faucet/x-auth';
import { xAuthConfig, redisConfig } from '../configs';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { XAction } from '@ergo-faucet/database';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupXAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const xAction = XAction.getInstance();
  const xAuthLogger = CallbackLoggerFactory.getInstance().getLogger('XAuth');

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
    xAuthLogger,
  );
  logger.info('XAuth initialized successfully');
};
