import { Migration1784453049444 } from './postgres/1784453049444-migration';
import { Migration1784453110873 } from './sqlite/1784453110873-migration';

export const migrations = {
  sqlite: [Migration1784453110873],
  postgres: [Migration1784453049444],
};
