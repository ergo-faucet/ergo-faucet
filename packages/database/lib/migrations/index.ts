import { Migration1755508470649 } from './postgres/1755508470649-migration';
import { Migration1755508423240 } from './sqlite/1755508423240-migration';

export const migrations = {
  sqlite: [Migration1755508423240],
  postgres: [Migration1755508470649],
};
