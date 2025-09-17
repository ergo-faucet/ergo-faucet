import { Migration1758106357561 } from './postgres/1758106357561-migration';
import { Migration1758106346293 } from './sqlite/1758106346293-migration';

export const migrations = {
  sqlite: [Migration1758106346293],
  postgres: [Migration1758106357561],
};
