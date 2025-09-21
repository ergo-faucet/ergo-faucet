import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import './bootstrap';
import {
  setupDatabase,
  setupDiscordAuth,
  setupErgoAuth,
  setupFastifyServer,
  setupGoogleAuth,
  setupRecaptcha,
  setupXAuth,
  setupController,
  startServerService,
  setupAccountant,
  setupErgoUtils,
} from './handler';
import { scheduleExpiringJob, schedulePayingJob } from './jobs';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const main = async () => {
  // Initialize all services
  try {
    await setupRecaptcha();
    await setupDatabase();
    await setupFastifyServer();
    await setupErgoAuth();
    await setupController();
    await setupDiscordAuth();
    await setupXAuth();
    await setupGoogleAuth();
    await setupErgoUtils();
    await setupAccountant();
    logger.info('All packages was initialized successfuly');
    await startServerService();
    await scheduleExpiringJob();
    await schedulePayingJob();
  } catch (err) {
    logger.debug('Error in initialize the packages', err);
  }
};

main();
