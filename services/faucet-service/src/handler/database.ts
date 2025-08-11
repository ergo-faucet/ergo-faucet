import {
  DataSourceHandler,
  DiscordAction,
  GoogleAction,
  PackageAction,
  UserAddressAction,
  XAction,
} from '@ergo-faucet/database';
import { dbConfig } from '../configs';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

export const setupDatabase = async () => {
  const dbLogger = CallbackLoggerFactory.getInstance().getLogger('Database');
  await DataSourceHandler.initialize(dbConfig, dbLogger);
  try {
    const dataSource = DataSourceHandler.getInstance().getDataSource();
    DiscordAction.initialize(dataSource, dbLogger);
    PackageAction.initialize(dataSource, dbLogger);
    UserAddressAction.initialize(dataSource, dbLogger);
    XAction.initialize(dataSource, dbLogger);
    GoogleAction.initialize(dataSource, dbLogger);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(
        `Error initializing database actions: ${error.message}`,
        error.stack,
      );
    }
  }
  logger.info('Database initialized successfully');
};
