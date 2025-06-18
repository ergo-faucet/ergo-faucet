export interface SqliteDataSourceConfig {
  type: 'sqlite';
  database: string;
  path: string;
  logging: false;
}

export interface PostgresDataSourceConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  logging: false;
}

export type DatabaseConfig = SqliteDataSourceConfig | PostgresDataSourceConfig;
