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
  mnemonic: config.has('ergo.mnemonic')
    ? config.get<string>('ergo.mnemonic')
    : undefined,
  passphrase: config.has('ergo.passphrase')
    ? config.get<string>('ergo.passphrase')
    : undefined,
  privateKey: config.has('ergo.privateKey')
    ? config.get<string>('ergo.privateKey')
    : undefined,
  timeout: config.get<number>('ergo.node.timeout'),
};
