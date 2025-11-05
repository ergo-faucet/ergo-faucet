import { Migration1761828414729 } from './sqlite/1761828414729-migration';
import { Migration1761828615374 } from './postgres/1761828615374-migration';

export const migrations = {
  sqlite: [Migration1761828414729],
  postgres: [Migration1761828615374],
};
