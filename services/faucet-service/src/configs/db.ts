import { DatabaseConfig } from '@ergo-faucet/database';
import config from 'config';

/**
 * Database configuration
 */
const dbType = config.get<'sqlite' | 'postgres'>('db.type');

export const dbConfig: DatabaseConfig =
  dbType === 'sqlite'
    ? {
        type: dbType,
        database: config.get<string>('db.database'),
        path: config.get<string>('db.path'),
        logging: false,
      }
    : {
        type: dbType,
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        username: config.get<string>('db.username'),
        password: config.get<string>('db.password'),
        database: config.get<string>('db.database'),
        logging: false,
      };
