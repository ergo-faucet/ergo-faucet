import { Migration1761732756105 } from './postgres/1761732756105-migration';
import { Migration1761808848208 } from './sqlite/1761808848208-migration';

export const migrations = {
  sqlite: [Migration1761808848208],
  postgres: [Migration1761732756105],
};
