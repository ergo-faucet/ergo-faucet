import config from 'config';

/**
 * job configuration
 */
export const jobConfig = {
  authJobInterval: config.get<number>('jobs.authJobInterval'),
  accountantJobInterval: config.get<number>('jobs.accountantJobInterval'),
};
