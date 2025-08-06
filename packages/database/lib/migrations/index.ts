import { Migration1754492696780 } from './postgres/1754492696780-migration';
import { Migration1754489748814 } from './sqlite/1754489748814-migration';

export const migrations = {
  sqlite: [Migration1754489748814],
  postgres: [Migration1754492696780],
};
