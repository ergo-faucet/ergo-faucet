import { Migration1754474534607 } from './postgres/1754474534607-migration';
import { Migration1754474527510 } from './sqlite/1754474527510-migration';

export const migrations = {
  sqlite: [Migration1754474527510],
  postgres: [Migration1754474534607],
};
