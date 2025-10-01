import { jobConfig } from '@configs';
import { Accountant } from '@ergo-faucet/accountant';

export const schedulePayingJob = async (): Promise<void> => {
  const jobInterval = jobConfig.accountantJobInterval * 1000; //convert to ms
  const accountant = Accountant.getInstance();
  setInterval(async () => {
    accountant.processUserRequests();
  }, jobInterval);
};
