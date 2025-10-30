import config from 'config';

/**
 * PaymentAuth configuration
 */
export const paymentAuthConfig = {
  expiresTime: config.get<number>('paymentAuth.expiresTime'),
  expiresTimeDelay: config.get<number>('paymentAuth.expiresTimeDelay'),
};
