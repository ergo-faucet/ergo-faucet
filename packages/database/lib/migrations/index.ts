import { Migration1755070405395 } from './postgres/1755070405395-migration';
import { Migration1756040608895 } from './sqlite/1756040608895-migration';

export const migrations = {
  sqlite: [Migration1756040608895],
  postgres: [Migration1755070405395],
};
