import { DataSource } from '@rosen-bridge/extended-typeorm';
import { entities } from '../entities';
import { migrations } from '../migrations';

const sqliteDataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  entities: [...entities],
  synchronize: false,
  logging: false,
  migrations: migrations.sqlite,
});

export default sqliteDataSource;
