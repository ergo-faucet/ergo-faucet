import { serverConfig } from '@configs';
import { FastifyAPIServer, ServerConfig } from '@ergo-faucet/fastify-server';
import { GoogleRecaptcha } from '@ergo-faucet/google-recaptcha';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupFastifyServer = async () => {
  const recaptcha = GoogleRecaptcha.getInstance();
  const fastifyLogger = DefaultLogger.getInstance().child('FastifyServer');
  const fasftyConfig: ServerConfig = {
    ...serverConfig,
    googleRecaptcha: recaptcha,
  };

  await FastifyAPIServer.initialize(fasftyConfig, fastifyLogger);
  logger.info('Fastify server initialized successfully');
};

export const startServerService = async () => {
  const server = FastifyAPIServer.getInstance();
  await server.start();
};
