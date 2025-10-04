import config from 'config';

/**
 * Ergo configuration
 */
export const ergoConfig = {
  network:
    config.get<string>('ergo.network').toLowerCase() === 'mainnet' ? 0 : 16,
  minFee: BigInt(config.get<number>('ergo.minFee')),
  minNanoErg: BigInt(config.get<number>('ergo.minNanoErg')),
  nodeUrl: config.get<string>('ergo.node.URL'),
  mnemonic: config.get<string>('ergo.mnemonic'),
  timeout: config.get<number>('ergo.node.timeout'),
};
