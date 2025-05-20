import path from 'path';
import { fileURLToPath } from 'url';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  Asset,
  AuthMethod,
  Package,
  PackageAuthMethod,
  User,
  UserAuthStatus,
  UserRequest,
} from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createDataSource = (type: 'sqlite' | 'postgres' = 'sqlite') => {
  const commonConfig = {
    entities: [
      Asset,
      AuthMethod,
      Package,
      PackageAuthMethod,
      User,
      UserAuthStatus,
      UserRequest,
    ],
    synchronize: false,
    logging: false,
  };

  if (type === 'sqlite') {
    return new DataSource({
      type: 'sqlite',
      database: path.join(__dirname, 'database.sqlite'),
      migrations: [path.join(__dirname, 'migrations/sqlite/*.ts')],
      ...commonConfig,
    });
  }

  return new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'ergo_faucet',
    migrations: [path.join(__dirname, 'migrations/postgres/*.ts')],
    ...commonConfig,
  });
};

export type AppDataSource = ReturnType<typeof createDataSource>;
