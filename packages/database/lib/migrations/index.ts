import { Migration1749315366533 } from './postgres/1749315366533-migration';
import { Migration1749315358572 } from './sqlite/1749315358572-migration';

export const migrations = {
  sqlite: [Migration1749315358572],
  postgres: [Migration1749315366533],
};
