import { createDataSource, AppDataSource } from './dataSource';
import { DatabaseConfig } from './utils';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

class DataSourceHandler {
  private static instance: DataSourceHandler = new DataSourceHandler();
  private dataSource?: AppDataSource;

  private constructor() {}

  /**
   * Retrieves the singleton instance of the DataSourceHandler.
   * @returns The singleton instance of DataSourceHandler.
   * @throws Error if the instance has not been initialized.
   */
  public static getInstance = (): DataSourceHandler => {
    if (!this.instance) {
      throw new Error('DataSourceHandler instance has not been initialized.');
    }
    return DataSourceHandler.instance;
  };

  /**
   * Initializes the data source with the provided configuration.
   * @param config - The database configuration object.
   * @returns The initialized AppDataSource instance.
   * @throws Error if initialization or migrations fail.
   */
  public static initialize = async (
    config: DatabaseConfig,
    logger?: AbstractLogger,
  ): Promise<AppDataSource> => {
    if (this.instance.dataSource?.isInitialized) {
      return this.instance.dataSource;
    }

    this.instance.dataSource = createDataSource(config);
    await this.instance.dataSource.initialize();
    await this.instance.dataSource.runMigrations();
    logger?.info(`Data Source (${config.type}) initialized successfully`);
    return this.instance.dataSource;
  };

  /**
   * Retrieves the current data source instance.
   * @returns The current AppDataSource instance or undefined if not initialized.
   */
  public getDataSource = (): AppDataSource => {
    return this.dataSource;
  };

  /**
   * Closes the current data source connection if it is initialized.
   * @returns A promise that resolves when the connection is closed.
   */
  public close = async (): Promise<void> => {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  };
}

export const dataSourceHandler = DataSourceHandler;
