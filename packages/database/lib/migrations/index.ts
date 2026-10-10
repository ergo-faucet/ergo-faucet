import { Migration1791614824604 } from './postgres/1791614824604-migration';
import { Migration1791614876900 } from './sqlite/1791614876900-migration';

export const migrations = {
  sqlite: [Migration1791614876900],
  postgres: [Migration1791614824604],
};
