import { Migration1756796313837 } from './postgres/1756796313837-migration';
import { Migration1755508423240 } from './sqlite/1755508423240-migration';

export const migrations = {
  sqlite: [Migration1755508423240],
  postgres: [Migration1756796313837],
};
