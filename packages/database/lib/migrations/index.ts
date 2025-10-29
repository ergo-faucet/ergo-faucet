import { Migration1761732756105 } from './postgres/1761732756105-migration';
import { Migration1761732766798 } from './sqlite/1761732766798-migration';

export const migrations = {
  sqlite: [Migration1761732766798],
  postgres: [Migration1761732756105],
};
