import { discordConfig, redisConfig } from '@configs';
import { DiscordAction } from '@ergo-faucet/database';
import { DiscordAuth } from '@ergo-faucet/discord-auth';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupDiscordAuth = async () => {
  const fastify = FastifyAPIServer.getInstance();
  const discordAction = DiscordAction.getInstance();
  const discordLogger = DefaultLogger.getInstance().child('DiscordAuth');

  await DiscordAuth.initialize(
    {
      fastifyServer: fastify,
      discordAction: discordAction,
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
