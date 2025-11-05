import { Migration1761828414729 } from './sqlite/1761828414729-migration';
import { Migration1762356087881 } from './postgres/1762356087881-migration';

export const migrations = {
  sqlite: [Migration1761828414729],
  postgres: [Migration1762356087881],
};
