import { createDataSource } from './dataSource';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { DatabaseConfig } from './index';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

/**
 * Singleton handler for managing database connections and operations.
 * Provides centralized control over data source initialization, access, and cleanup.
 */
class DataSourceHandler {
  private static instance: DataSourceHandler;
  private dataSource: DataSource;
  private logger: AbstractLogger;

  /**
   * Private constructor to enforce singleton pattern.
   * @param config - Database configuration parameters
   * @param logger - Logger instance (falls back to DummyLogger if not provided)
   */
  private constructor(config: DatabaseConfig, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.dataSource = createDataSource(config);
  }

  /**
   * Gets the singleton instance of DataSourceHandler.
   * @returns The initialized DataSourceHandler instance
   * @throws {Error} If handler hasn't been initialized via initialize() first
   * @example
   * const handler = DataSourceHandler.getInstance();
   */
  public static getInstance = (): DataSourceHandler => {
    if (!this.instance) {
      throw new Error('DataSourceHandler instance has not been initialized.');
    }
    return DataSourceHandler.instance;
  };

  /**
   * Initializes the database connection and runs pending migrations.
   * @param config - Database configuration parameters
   * @param logger - Optional logger instance for connection events
   * @returns Promise that resolves when initialization is complete
   * @throws {Error} If connection initialization or migrations fail
   * @example
   * await DataSourceHandler.initialize(config, logger);
   */
  public static initialize = async (
    config: DatabaseConfig,
    logger?: AbstractLogger,
  ): Promise<void> => {
    if (this.instance) {
      return;
    }

    this.instance = new DataSourceHandler(config, logger);
    await this.instance.dataSource.initialize();
    await this.instance.dataSource.runMigrations();
    this.instance.logger.info(
      `Data Source (${config.type}) initialized successfully`,
    );
    return;
  };

  /**
   * Gets the active data source instance.
   * @returns Configured DataSource instance or undefined if not initialized
   * @example
   * const dataSource = handler.getDataSource();
   */
  public getDataSource = (): DataSource => {
    return this.dataSource;
  };

  /**
   * Safely closes the database connection if active.
   * @returns Promise that resolves when connection is closed
   * @example
   * await handler.close();
   */
  public close = async (): Promise<void> => {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      this.logger.info('Database connection closed');
    }
  };
}

export { DataSourceHandler };
