import { Migration1754843414750 } from './postgres/1754843414750-migration';
import { Migration1754843408255 } from './sqlite/1754843408255-migration';

export const migrations = {
  sqlite: [Migration1754843408255],
  postgres: [Migration1754843414750],
};
