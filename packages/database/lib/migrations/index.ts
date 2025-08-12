import { Migration1755017835527 } from './postgres/1755017835527-migration';
import { Migration1755017612974 } from './sqlite/1755017612974-migration';

export const migrations = {
  sqlite: [Migration1755017612974],
  postgres: [Migration1755017835527],
};
