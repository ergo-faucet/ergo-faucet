import { Migration1755241769975 } from './postgres/1755241769975-migration';
import { Migration1755241730413 } from './sqlite/1755241730413-migration';

export const migrations = {
  sqlite: [Migration1755241730413],
  postgres: [Migration1755241769975],
};
