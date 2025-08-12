import config from 'config';

/**
 * Redis configuration
 */
export const redisConfig = {
  host: config.get<string>('redis.host'),
  port: config.get<number>('redis.port'),
  password: config.get<string>('redis.password'),
};
