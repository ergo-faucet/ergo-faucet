import { DiscordAuth } from '@ergo-faucet/discord-auth';
import { discordConfig, redisConfig } from '@configs';
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
      action: discordAction,
      clientID: discordConfig.clientID,
      clientSecret: discordConfig.clientSecret,
      redirectURL: discordConfig.redirectURL,
      scope: discordConfig.scope,
      expiresTime: discordConfig.expiresTime,
      sessionTTL: discordConfig.sessionTTL,
      redis: redisConfig,
      frontBaseURL: discordConfig.frontBaseURL,
    },
    discordLogger,
  );
  logger.info('DiscordAuth initialized successfully');
};
