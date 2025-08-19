import config from 'config';

/**
 * Auth job configuration
 */
export const authJobConfig = {
  jobInterval: config.get<number>('authJob.jobInterval'),
};
