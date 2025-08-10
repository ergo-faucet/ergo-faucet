import { DiscordAuth } from '@ergo-faucet/discord-auth';
import { discordConfig } from '../configs';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DiscordAction } from '@ergo-faucet/database';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupDiscordAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const discordAction = DiscordAction.getInstance();
  const discordLogger =
    CallbackLoggerFactory.getInstance().getLogger('DiscordAuth');

  await DiscordAuth.initialize(
    {
      fastifyServer: fastify,
      discordAction: discordAction,
      clientID: discordConfig.clientID,
      clientSecret: discordConfig.clientSecret,
      redirectURL: discordConfig.redirectURL,
      scope: discordConfig.scope,
      expiresTime: discordConfig.expiresTime,
    },
    discordLogger,
  );
  logger.info('DiscordAuth initialized successfully');
};
