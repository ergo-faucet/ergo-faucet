import { Migration1749167197731 } from './postgres/1749167197731-migration';
import { Migration1749167212374 } from './sqlite/1749167212374-migration';

export const migrations = {
  sqlite: [Migration1749167212374],
  postgres: [Migration1749167197731],
};
