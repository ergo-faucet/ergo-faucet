// lib/postgresDataSource.ts
import { DataSource } from '@rosen-bridge/extended-typeorm';

import { entities } from '../entities';
import { migrations } from '../migrations';

const postgresDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'ergo_faucet',
  entities: [...entities],
  synchronize: false,
  logging: false,
  migrations: migrations.postgres,
});

export default postgresDataSource;
