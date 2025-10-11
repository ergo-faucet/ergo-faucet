import { Migration1758541414828 } from './sqlite/1758541414828-migration';
import { Migration1758541946064 } from './postgres/1758541946064-migration';

export const migrations = {
  sqlite: [Migration1758541414828],
  postgres: [Migration1758541946064],
};
