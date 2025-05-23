export interface SqliteDataSourceConfig {
  type: 'sqlite';
  database: string;
}

export interface PostgresDataSourceConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export type DatabaseConfig = SqliteDataSourceConfig | PostgresDataSourceConfig;
