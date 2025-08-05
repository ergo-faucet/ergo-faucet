import { FastifyAPIServer, ServerConfig } from '@ergo-faucet/fastify-server';
import { serverConfig } from '../configs';
import { GoogleRecaptcha } from '@ergo-faucet/google-recaptcha';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupFastifyServer = async () => {
  const recaptcha = GoogleRecaptcha.getInstance();
  const fastifyLogger =
    CallbackLoggerFactory.getInstance().getLogger('FastifyServer');
  const fasftyConfig: ServerConfig = {
    ...serverConfig,
    googleRecaptcha: recaptcha,
  };

  await FastifyAPIServer.initialize(fasftyConfig, fastifyLogger);
  logger.info('Fastify server initialized successfully');
};
