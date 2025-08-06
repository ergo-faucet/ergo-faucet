import { Migration1754473797323 } from './postgres/1754473797323-migration';
import { Migration1754473786497 } from './sqlite/1754473786497-migration';

export const migrations = {
  sqlite: [Migration1754473786497],
  postgres: [Migration1754473797323],
};
