import { jobConfig } from '@configs';
import { PaymentAuth } from '@ergo-faucet/payment-auth';

export const scheduleVerifyIncomingPaymentsJob = async (): Promise<void> => {
  const jobInterval = jobConfig.paymentAuthJobInterval * 1000; //convert to ms
  const paymentAuth = PaymentAuth.getInstance();
  setInterval(async () => {
    paymentAuth.processPayments();
  }, jobInterval);
};
