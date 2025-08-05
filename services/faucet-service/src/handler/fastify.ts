import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import {
  serverConfig,
  cookieConfig,
  swaggerConfig,
  swaggerUiConfig,
} from '../configs';
import { GoogleRecaptcha } from '@ergo-faucet/google-recaptcha';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupFastifyServer = async () => {
  const recaptcha = GoogleRecaptcha.getInstance();
  const fastifyLogger =
    CallbackLoggerFactory.getInstance().getLogger('FastifyServer');

  await FastifyAPIServer.initialize(
    {
      port: serverConfig.port,
      host: serverConfig.host,
      corsOrigins: serverConfig.corsOrigins,
      swagger: swaggerConfig,
      swaggerUi: swaggerUiConfig,
      activeFastifyLogger: serverConfig.activeFastifyLogger,
      jwtSecret: serverConfig.jwtSecret,
      jwtExpiration: serverConfig.jwtExpiration,
      cookie: cookieConfig,
      googleRecaptcha: recaptcha,
    },
    fastifyLogger,
  );
  logger.info('Fastify server initialized successfully');
};
