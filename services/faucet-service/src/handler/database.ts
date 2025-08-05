import { DataSourceHandler } from '@ergo-faucet/database';
import { dbConfig } from '../configs';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupDatabase = async () => {
  const dbLogger = CallbackLoggerFactory.getInstance().getLogger('Database');
  await DataSourceHandler.initialize(dbConfig, dbLogger);
  logger.info('Database initialized successfully');
};
