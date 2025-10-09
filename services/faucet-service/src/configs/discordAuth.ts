import config from 'config';

/**
 * Discord configuration
 */
export const discordConfig = {
  clientID: config.get<string>('discord.clientID'),
  clientSecret: config.get<string>('discord.clientSecret'),
  redirectURL: config.get<string>('discord.redirectURL'),
  scope: config.get<string>('discord.scope'),
  expiresTime: config.get<number>('discord.expiresTime'),
  sessionTTL: config.get<number>('discord.sessionTTL'),
  frontBaseURL: config.get<string>('URLs.frontCallbackURL'),
};
