import config from 'config';

/**
 * ErgoUtils configuration
 */
export const ergoUtilsConfig = {
  network:
    config.get<string>('ergo.network').toLowerCase() === 'mainnet' ? 0 : 16,
  nodeUrl: config.get<string>('ergo.nodeUrl'),
  mnemonic: config.get<string>('wallet.mnemonic'),
  timeout: config.get<number>('network.timeout'),
};
