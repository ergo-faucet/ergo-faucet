import { Migration1762941030485 } from './postgres/1762941030485-migration';
import { Migration1762941020149 } from './sqlite/1762941020149-migration';

export const migrations = {
  sqlite: [Migration1762941020149],
  postgres: [Migration1762941030485],
};
