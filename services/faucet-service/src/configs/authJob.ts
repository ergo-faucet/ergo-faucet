import config from 'config';

/**
 * Auth job configuration
 */
export const authJobConfig = {
  authJobInterval: config.get<number>('jobs.authJobInterval'),
};
