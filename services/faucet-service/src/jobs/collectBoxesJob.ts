import { jobConfig } from '@configs';
import { PaymentAuth } from '@ergo-faucet/payment-auth';

export const scheduleCollectBoxesJob = async (): Promise<void> => {
  const jobInterval = jobConfig.collectUserPaidBoxesJobInterval * 1000; //convert to ms
  const paymentAuth = PaymentAuth.getInstance();
  setInterval(async () => {
    paymentAuth.collectBoxes();
  }, jobInterval);
};
