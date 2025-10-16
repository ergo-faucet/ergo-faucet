import { Migration1760624463012 } from './postgres/1760624463012-migration';
import { Migration1760624455287 } from './sqlite/1760624455287-migration';

export const migrations = {
  sqlite: [Migration1760624455287],
  postgres: [Migration1760624463012],
};
