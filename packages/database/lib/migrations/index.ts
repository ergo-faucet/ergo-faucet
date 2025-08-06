import { Migration1754189070290 } from './postgres/1754189070290-migration';
import { Migration1754189057736 } from './sqlite/1754189057736-migration';

export const migrations = {
  sqlite: [Migration1754189057736],
  postgres: [Migration1754189070290],
};
