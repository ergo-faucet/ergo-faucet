import { Migration1760621154725 } from './postgres/1760621154725-migration';
import { Migration1760621144720 } from './sqlite/1760621144720-migration';

export const migrations = {
  sqlite: [Migration1760621144720],
  postgres: [Migration1760621154725],
};
