import { Migration1749324756742 } from './postgres/1749324756742-migration';
import { Migration1749324751656 } from './sqlite/1749324751656-migration';

export const migrations = {
  sqlite: [Migration1749324751656],
  postgres: [Migration1749324756742],
};
