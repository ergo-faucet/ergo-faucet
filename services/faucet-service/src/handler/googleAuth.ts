import { GoogleAuth } from '@ergo-faucet/google-auth';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DataSourceHandler } from '@ergo-faucet/database';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { googleAuthConfig, redisConfig } from 'src/configs';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupGoogleAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const googleAction =
    DataSourceHandler.getInstance().getActions().googleAction;
  const googleLogger =
    CallbackLoggerFactory.getInstance().getLogger('googleAuth');

  await GoogleAuth.initialize(
    {
      fastifyServer: fastify,
      googleAction: googleAction,
      clientID: googleAuthConfig.clientId,
      clientSecret: googleAuthConfig.clientSecret,
      redirectURL: googleAuthConfig.redirectUrl,
      scope: googleAuthConfig.scope,
      expiresTime: googleAuthConfig.expiresTime,
      sessionTTL: googleAuthConfig.sessionTTL,
      redis: redisConfig,
    },
    googleLogger,
  );
  logger.info('GoogleAuth initialized successfully');
};
