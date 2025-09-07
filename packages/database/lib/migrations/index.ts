import { Migration1757219948595 } from './postgres/1757219948595-migration';
import { Migration1757220227025 } from './sqlite/1757220227025-migration';

export const migrations = {
  sqlite: [Migration1757220227025],
  postgres: [Migration1757219948595],
};
