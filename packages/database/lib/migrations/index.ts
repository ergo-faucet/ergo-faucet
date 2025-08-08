import { Migration1754627185778 } from './postgres/1754627185778-migration';
import { Migration1754626830333 } from './sqlite/1754626830333-migration';

export const migrations = {
  sqlite: [Migration1754626830333],
  postgres: [Migration1754627185778],
};
