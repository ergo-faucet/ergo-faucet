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
  setupPaymentAuth,
} from './handler';
import {
  scheduleExpiringJob,
  schedulePayingJob,
  scheduleVerifyIncomingPaymentsJob,
} from './jobs';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const main = async () => {
  // Initialize all services
  try {
    await setupRecaptcha();
    await setupDatabase();
    await setupFastifyServer();
    await setupErgoAuth();
    await setupErgoUtils();
    await setupController();
    await setupDiscordAuth();
    await setupXAuth();
    await setupGoogleAuth();
    await setupAccountant();
    await setupPaymentAuth();
    logger.info('All packages was initialized successfuly');
    await startServerService();
    await scheduleExpiringJob();
    await schedulePayingJob();
    await scheduleVerifyIncomingPaymentsJob();
  } catch (err) {
    logger.debug('Error in initialize the packages', err);
  }
};

main();
