import { Migration1784459324793 } from './postgres/1784459324793-migration';
import { Migration1784459381617 } from './sqlite/1784459381617-migration';

export const migrations = {
  sqlite: [Migration1784459381617],
  postgres: [Migration1784459324793],
};
