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
} from './handler';
import { scheduleExpiringJob } from './jobs';

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
    logger.info('All packages was initialized successfuly');
    await startServerService();
    await scheduleExpiringJob();
  } catch (err) {
    logger.debug('Error in initialize the packages', err);
  }
};

main();
