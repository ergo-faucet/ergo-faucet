import { Migration1748729967648 } from './postgres/1748729967648-migration';
import { Migration1748729954009 } from './sqlite/1748729954009-migration';

export const migrations = {
  sqlite: [Migration1748729954009],
  postgres: [Migration1748729967648],
};
