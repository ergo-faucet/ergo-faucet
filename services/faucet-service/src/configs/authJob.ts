import config from 'config';

/**
 * job configuration
 */
export const jobConfig = {
  authJobInterval: config.get<number>('jobs.authJobInterval'),
  accountantJobInterval: config.get<number>('jobs.accountantJobInterval'),
  paymentAuthJobInterval: config.get<number>('jobs.paymentAuthJobInterval'),
  collectUserPaidBoxesJobInterval: config.get<number>(
    'jobs.collectUserPaidBoxesJobInterval',
  ),
};
