import config from 'config';

/**
 * Accountant configuration
 */
export const accountantConfig = {
  tryLimit: config.get<number>('accountant.tryLimit'),
  confirmationLimit: config.get<number>('accountant.confirmationLimit'),
};
