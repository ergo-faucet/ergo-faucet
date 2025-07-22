import { Migration1753177849609 } from './postgres/1753177849609-migration';
import { Migration1753177845495 } from './sqlite/1753177845495-migration';

export const migrations = {
  sqlite: [Migration1753177845495],
  postgres: [Migration1753177849609],
};
