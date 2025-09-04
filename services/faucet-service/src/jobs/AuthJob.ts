import WinstonLogger from '@rosen-bridge/winston-logger';
import { DiscordAction, GoogleAction, XAction } from '@ergo-faucet/database';
import { authJobConfig } from '@configs';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

const jobExpireDiscordAuths = async (): Promise<void> => {
  const discordAction = DiscordAction.getInstance();
  discordAction
    .expireAllExpiredDiscordAuths()
    .then()
    .catch((err) => {
      logger.error('Error in expiring Discord Auths', err);
    });
  logger.info('Expired Discord Auths job done');
};

const jobExpireGoogleAuths = async (): Promise<void> => {
  const googleAction = GoogleAction.getInstance();
  googleAction
    .expireAllExpiredGoogleAuths()
    .then()
    .catch((err) => {
      logger.error('Error in expiring Google Auths', err);
    });
  logger.info('Expired Google Auths job done');
};

const jobExpireXAuths = async (): Promise<void> => {
  const xAction = XAction.getInstance();
  xAction
    .expireAllExpiredXAuths()
    .then()
    .catch((err) => {
      logger.error('Error in expiring X Auths', err);
    });
  logger.info('Expired X Auths job done');
};

export const scheduleExpiringJob = async (): Promise<void> => {
  const jobInterval = authJobConfig.authJobInterval * 1000; //convert to ms
  setInterval(async () => {
    await jobExpireDiscordAuths();
    await jobExpireGoogleAuths();
    await jobExpireXAuths();
  }, jobInterval);
};
