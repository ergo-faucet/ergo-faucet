import { Migration1757491706111 } from './sqlite/1757491706111-migration';
import { Migration1757491638975 } from './postgres/1757491638975-migration';

export const migrations = {
  sqlite: [Migration1757491706111],
  postgres: [Migration1757491638975],
};
