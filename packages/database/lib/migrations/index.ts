import { Migration1747853882686 } from './postgres/1747853882686-migration';
import { Migration1747851918422 } from './sqlite/1747851918422-migration';

export const migrations = {
  sqlite: [Migration1747851918422],
  postgres: [Migration1747853882686],
};
