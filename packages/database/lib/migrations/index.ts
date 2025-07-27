import { Migration1753531757728 } from './postgres/1753531757728-migration';
import { Migration1753531744624 } from './sqlite/1753531744624-migration';

export const migrations = {
  sqlite: [Migration1753531744624],
  postgres: [Migration1753531757728],
};
