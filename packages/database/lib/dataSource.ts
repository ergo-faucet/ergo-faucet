import { DataSource } from '@rosen-bridge/extended-typeorm';

import { entities } from './entities';
import { DatabaseConfig } from './index';
import { migrations } from './migrations';

/**
 * Common configuration for the data source.
 * Includes entities, synchronization, logging, and migrations.
 */
const commonConfig = {
  entities: [...entities],
  synchronize: false,
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
    migrations: migrations[config.type],
  };

  return new DataSource(finalConfig);
};
