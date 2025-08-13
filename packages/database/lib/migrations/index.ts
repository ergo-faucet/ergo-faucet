import { Migration1755070405395 } from './postgres/1755070405395-migration';
import { Migration1755070398282 } from './sqlite/1755070398282-migration';

export const migrations = {
  sqlite: [Migration1755070398282],
  postgres: [Migration1755070405395],
};
