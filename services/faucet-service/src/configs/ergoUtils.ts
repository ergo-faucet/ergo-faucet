import config from 'config';

/**
 * ErgoUtils configuration
 */
export const ergoUtilsConfig = {
  network:
    config.get<string>('ergo.network').toLowerCase() === 'mainnet' ? 0 : 16,
  nodeUrl: config.get<string>('ergo.node.URL'),
  mnemonic: config.get<string>('ergo.mnemonic'),
  timeout: config.get<number>('ergo.node.timeout'),
};
