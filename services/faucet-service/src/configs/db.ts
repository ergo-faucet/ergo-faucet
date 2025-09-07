import { DatabaseConfig } from '@ergo-faucet/database';
import config from 'config';

/**
 * Database configuration
 */
const dbType = config.get<'sqlite' | 'postgres'>('database.type');

export const dbConfig: DatabaseConfig =
  dbType === 'sqlite'
    ? {
        type: dbType,
        database: config.get<string>('database.database'),
        logging: config.get<boolean>('database.logging'),
      }
    : {
        type: dbType,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        logging: config.get<boolean>('database.logging'),
      };
