import { Migration1757495124113 } from './sqlite/1757495124113-migration';
import { Migration1757495164058 } from './postgres/1757495164058-migration';

export const migrations = {
  sqlite: [Migration1757495124113],
  postgres: [Migration1757495164058],
};
