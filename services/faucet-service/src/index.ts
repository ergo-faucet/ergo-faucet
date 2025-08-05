import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import './bootstrap';
import {
  setupDatabase,
  setupDiscordAuth,
  setupErgoAuth,
  setupFastifyServer,
  setupRecaptcha,
  setupXAuth,
} from './handler';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const main = async () => {
  // Initialize all services
  try {
    await setupRecaptcha();
    await setupDatabase();
    await setupFastifyServer();
    await setupErgoAuth();
    await setupDiscordAuth();
    await setupXAuth();
    logger.info('All packages was initialized successfuly');
  } catch (err) {
    logger.debug('Error in initialize the packages', err);
  }
};

main();
