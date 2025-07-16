import { Migration1752565753203 } from './postgres/1752565753203-migration';
import { Migration1752565759115 } from './sqlite/1752565759115-migration';

export const migrations = {
  sqlite: [Migration1752565759115],
  postgres: [Migration1752565753203],
};
