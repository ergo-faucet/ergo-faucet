import { DataSource } from '@rosen-bridge/extended-typeorm';
import { entities } from './entities';
import { migrations } from './migrations';
import { DatabaseConfig, CommonDataSourceConfig } from './utils';

/**
 * Common configuration for the data source.
 * Includes entities, synchronization, logging, and migrations.
 */
const commonConfig: CommonDataSourceConfig = {
  entities: [...entities],
  synchronize: false,
  logging: false,
  migrations: [],
};

/**
 * Creates a new data source instance based on the provided configuration.
 * @param config - The database configuration object.
 * @returns A new instance of the DataSource.
 */
export const createDataSource = (config: DatabaseConfig) => {
  const finalConfig = {
    ...commonConfig,
    ...config,
    migrations: migrations[config.type] || [],
  };

  return new DataSource(finalConfig);
};

/**
 * Type definition for the application data source.
 * Represents the return type of the createDataSource function or undefined.
 */
export type AppDataSource = ReturnType<typeof createDataSource> | undefined;
