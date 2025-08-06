import { Migration1754524256174 } from './postgres/1754524256174-migration';
import { Migration1754523855018 } from './sqlite/1754523855018-migration';

export const migrations = {
  sqlite: [Migration1754523855018],
  postgres: [Migration1754524256174],
};
