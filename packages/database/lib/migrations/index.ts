import { Migration1747853882686 } from './postgres/1747853882686-migration';
import { Migration1747851918422 } from './sqlite/1747851918422-migration';
import { Migration1747990443678 } from './postgres/1747990443678-migration';
import { Migration1747990433954 } from './sqlite/1747990433954-migration';

export const migrations = {
  sqlite: [Migration1747851918422, Migration1747990433954],
  postgres: [Migration1747853882686, Migration1747990443678],
};
