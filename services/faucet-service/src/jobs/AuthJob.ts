import WinstonLogger from '@rosen-bridge/winston-logger';
import { DiscordAction, GoogleAction, XAction } from '@ergo-faucet/database';
import { AuthJobType } from 'src/types';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

export class AuthJob {
  private static instance: AuthJob;
  private discordAction: DiscordAction;
  private googleAction: GoogleAction;
  private xAction: XAction;
  private jobInterval: number;

  private constructor(configs: AuthJobType) {
    this.discordAction = configs.discordAction;
    this.googleAction = configs.googleAction;
    this.xAction = configs.xAction;
    this.jobInterval = configs.jobInterval;
  }

  public static initialize(configs: AuthJobType) {
    if (this.instance) throw new Error('AuthJob instance already initialized.');
    this.instance = new AuthJob(configs);
  }

  public static getInstance(): AuthJob {
    if (!this.instance) throw new Error('AuthJob instance not initialized.');
    return this.instance;
  }

  private async processExpired(): Promise<void> {
    logger.debug('Starting auth expiration job');
    try {
      this.discordAction.expireAllExpiredDiscordAuths();
      this.googleAction.expireAllExpiredGoogleAuths();
      this.xAction.expireAllExpiredXAuths();
    } catch (error) {
      logger.error('Error in auth expiration job:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    logger.info('Auth expiration job completed');
  }

  /** Schedule the job repeatedly using setTimeout */
  public async scheduleJob(): Promise<void> {
    try {
      await this.processExpired();
    } finally {
      setTimeout(() => this.scheduleJob(), this.jobInterval);
    }
  }
}
