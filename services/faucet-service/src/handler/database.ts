import { dbConfig } from '@configs';
import {
  AccountantAction,
  DataSourceHandler,
  DiscordAction,
  GoogleAction,
  PackageAction,
  RequestHistoryAction,
  UserAddressAction,
  XAction,
} from '@ergo-faucet/database';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

export const setupDatabase = async () => {
  const dbLogger = DefaultLogger.getInstance().child('Database');
  await DataSourceHandler.initialize(dbConfig, dbLogger);
  try {
    const dataSource = DataSourceHandler.getInstance().getDataSource();
    await DiscordAction.initialize(dataSource, dbLogger);
    PackageAction.initialize(dataSource, dbLogger);
    UserAddressAction.initialize(dataSource, dbLogger);
    await XAction.initialize(dataSource, dbLogger);
    await GoogleAction.initialize(dataSource, dbLogger);
    RequestHistoryAction.initialize(dataSource, dbLogger);
    await AccountantAction.initialize(dataSource, dbLogger);
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
