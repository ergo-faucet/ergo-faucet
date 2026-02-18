import { googleAuthConfig, redisConfig } from '@configs';
import { GoogleAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { GoogleAuth } from '@ergo-faucet/google-auth';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupGoogleAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const googleAction = GoogleAction.getInstance();
  const googleLogger = DefaultLogger.getInstance().child('GoogleAuth');

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
      frontBaseURL: googleAuthConfig.frontBaseURL,
    },
    googleLogger,
  );
  logger.info('GoogleAuth initialized successfully');
};
