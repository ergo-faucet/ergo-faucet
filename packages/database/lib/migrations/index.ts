import { Migration1754627185778 } from './postgres/1754627185778-migration';
import { Migration1756040608895 } from './sqlite/1756040608895-migration';

export const migrations = {
  sqlite: [Migration1756040608895],
  postgres: [Migration1754627185778],
};
