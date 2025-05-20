import { createDataSource, AppDataSource } from './dataSource';

class DataSourceHandler {
  private static instance: DataSourceHandler;
  private dataSource?: AppDataSource;

  private constructor() {}

  public static getInstance(): DataSourceHandler {
    if (!DataSourceHandler.instance) {
      DataSourceHandler.instance = new DataSourceHandler();
    }
    return DataSourceHandler.instance;
  }

  public async initialize(
    type: 'postgres' | 'sqlite' = 'sqlite',
  ): Promise<AppDataSource> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource;
    }

    this.dataSource = createDataSource(type);
    try {
      await this.dataSource.initialize();
      console.log(`Data Source (${type}) initialized successfully`);
      return this.dataSource;
    } catch (error) {
      console.error(`Error initializing ${type} Data Source:`, error);
      throw error;
    }
  }

  public getDataSource(): AppDataSource {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  public async close(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      console.log('Data Source connection closed');
    }
  }
}

export const dataSourceHandler = DataSourceHandler.getInstance();
