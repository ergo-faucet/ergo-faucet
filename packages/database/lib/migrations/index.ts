import { Migration1749727283181 } from './postgres/1749727283181-migration';
import { Migration1749727277644 } from './sqlite/1749727277644-migration';

export const migrations = {
  sqlite: [Migration1749727277644],
  postgres: [Migration1749727283181],
};
