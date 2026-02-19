import { Migration1762941020149 } from './sqlite/1762941020149-migration';
import { Migration1766477126311 } from './postgres/1766477126311-migration';

export const migrations = {
  sqlite: [Migration1762941020149],
  postgres: [Migration1766477126311],
};
