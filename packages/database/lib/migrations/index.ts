import { Migration1756902229512 } from './postgres/1756902229512-migration';
import { Migration1756902210929 } from './sqlite/1756902210929-migration';

export const migrations = {
  sqlite: [Migration1756902210929],
  postgres: [Migration1756902229512],
};
