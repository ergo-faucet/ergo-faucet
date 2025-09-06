import config from 'config';

/**
 * Controller configuration
 */
export const controllerConfig = {
  networkType:
    config.get<string>('ergo.network').toLowerCase() === 'mainnet' ? 0 : 16,
};
