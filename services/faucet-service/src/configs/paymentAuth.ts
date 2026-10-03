import config from 'config';

/**
 * PaymentAuth configuration
 */
export const paymentAuthConfig = {
  expiresTime: config.get<number>('paymentAuth.expiresTime'),
  expiresTimeDelay: config.get<number>('paymentAuth.expiresTimeDelay'),
  ownerPk: config.get<string>('paymentAuth.ownerPk'),
  maxAddress: config.get<number>('paymentAuth.maxAddress'),
};
