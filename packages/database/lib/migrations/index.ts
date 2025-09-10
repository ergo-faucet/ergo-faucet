import { Migration1757487890345 } from './postgres/1757487890345-migration';
import { Migration1757487773092 } from './sqlite/1757487773092-migration';

export const migrations = {
  sqlite: [Migration1757487773092],
  postgres: [Migration1757487890345],
};
