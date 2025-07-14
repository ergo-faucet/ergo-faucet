import { Migration1752495577580 } from './postgres/1752495577580-migration';
import { Migration1752495585030 } from './sqlite/1752495585030-migration';

export const migrations = {
  sqlite: [Migration1752495577580],
  postgres: [Migration1752495585030],
};
