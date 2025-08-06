import { Migration1754492064051 } from './postgres/1754492064051-migration';
import { Migration1754491978755 } from './sqlite/1754491978755-migration';

export const migrations = {
  sqlite: [Migration1754491978755],
  postgres: [Migration1754492064051],
};
