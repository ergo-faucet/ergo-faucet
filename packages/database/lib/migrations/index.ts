import { Migration1758373520158 } from './sqlite/1758373520158-migration';
import { Migration1758373641077 } from './postgres/1758373641077-migration';

export const migrations = {
  sqlite: [Migration1758373520158],
  postgres: [Migration1758373641077],
};
