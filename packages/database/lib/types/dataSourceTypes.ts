export interface SqliteDataSourceConfig {
  type: 'sqlite';
  database: string;
  logging: boolean;
}

export interface PostgresDataSourceConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  logging: boolean;
}

export type DatabaseConfig = SqliteDataSourceConfig | PostgresDataSourceConfig;
