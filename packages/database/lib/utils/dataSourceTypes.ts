import { MigrationInterface } from 'typeorm';
import { EntityClasses } from '../entities';

export interface CommonDataSourceConfig {
  entities: EntityClasses[];
  synchronize: boolean;
  logging: boolean;
  migrations: MigrationInterface[];
}

export interface SqliteDataSourceConfig extends CommonDataSourceConfig {
  type: 'sqlite';
  database: string;
}

export interface PostgresDataSourceConfig extends CommonDataSourceConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export type DatabaseConfig = SqliteDataSourceConfig | PostgresDataSourceConfig;
