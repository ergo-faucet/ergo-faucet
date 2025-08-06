import { Migration1754469343572 } from './postgres/1754469343572-migration';
import { Migration1754469335624 } from './sqlite/1754469335624-migration';

export const migrations = {
  sqlite: [Migration1754469335624],
  postgres: [Migration1754469343572],
};
