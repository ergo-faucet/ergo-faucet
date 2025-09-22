import config from 'config';

/**
 * Accountant configuration
 */
export const accountantConfig = {
  network:
    config.get<string>('ergo.network').toLowerCase() === 'mainnet' ? 0 : 16,
  minFee: BigInt(config.get<number>('ergo.minFee')),
  minNanoErg: BigInt(config.get<number>('ergo.minNanoErg')),
  tryLimit: config.get<number>('accountant.tryLimit'),
  confirmationLimit: config.get<number>('ergo.confirmationLimit'),
};
