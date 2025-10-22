import { Migration1761816140460 } from './sqlite/1761816140460-migration';
import { Migration1761816359724 } from './postgres/1761816359724-migration';

export const migrations = {
  sqlite: [Migration1761816140460],
  postgres: [Migration1761816359724],
};
