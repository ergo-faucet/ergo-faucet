import WinstonLogger from '@rosen-bridge/winston-logger';
import { DiscordAction, GoogleAction, XAction } from '@ergo-faucet/database';
import { jobConfig } from '@configs';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

const jobExpireDiscordAuths = async (): Promise<void> => {
  const discordAction = DiscordAction.getInstance();
  discordAction
    .expireAllExpiredAuths()
    .then()
    .catch((err) => {
      logger.error(`Error in expiring Discord Auths`, {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
      });
    });
  logger.info('Expired Discord Auths job done');
};

const jobExpireGoogleAuths = async (): Promise<void> => {
  const googleAction = GoogleAction.getInstance();
  googleAction
    .expireAllExpiredAuths()
    .then()
    .catch((err) => {
      logger.error(`Error in expiring Google Auths`, {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
      });
    });
  logger.info('Expired Google Auths job done');
};

const jobExpireXAuths = async (): Promise<void> => {
  const xAction = XAction.getInstance();
  xAction
    .expireAllExpiredAuths()
    .then()
    .catch((err) => {
      logger.error(`Error in expiring X Auths`, {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
      });
    });
  logger.info('Expired X Auths job done');
};

export const scheduleExpiringJob = async (): Promise<void> => {
  const jobInterval = jobConfig.authJobInterval * 1000; //convert to ms
  setInterval(async () => {
    await jobExpireDiscordAuths();
    await jobExpireGoogleAuths();
    await jobExpireXAuths();
  }, jobInterval);
};
