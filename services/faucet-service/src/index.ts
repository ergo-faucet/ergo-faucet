import './bootstrap';
import {
  setupDatabase,
  setupDiscordAuth,
  setupErgoAuth,
  setupFastifyServer,
  setupRecaptcha,
  setupXAuth,
} from './handler';

const main = async () => {
  // Initialize all services
  await setupRecaptcha();
  await setupDatabase();
  await setupFastifyServer();
  await setupErgoAuth();
  await setupDiscordAuth();
  await setupXAuth();
};

main();
