import { Migration1758209265964 } from './postgres/1758209265964-migration';
import { Migration1758209125093 } from './sqlite/1758209125093-migration';

export const migrations = {
  sqlite: [Migration1758209125093],
  postgres: [Migration1758209265964],
};
