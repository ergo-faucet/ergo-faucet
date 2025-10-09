import { Migration1760001041325 } from './postgres/1760001041325-migration';
import { Migration1760001025631 } from './sqlite/1760001025631-migration';

export const migrations = {
  sqlite: [Migration1760001025631],
  postgres: [Migration1760001041325],
};
