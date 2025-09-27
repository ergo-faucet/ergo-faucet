import { Migration1758972274997 } from './postgres/1758972274997-migration';
import { Migration1758972259171 } from './sqlite/1758972259171-migration';

export const migrations = {
  sqlite: [Migration1758972259171],
  postgres: [Migration1758972274997],
};
