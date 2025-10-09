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
  mnemonic: config.get<string>('ergo.mnemonic').length
    ? config.get<string>('ergo.mnemonic')
    : undefined,
  passphrase: config.get<string>('ergo.passphrase').length
    ? config.get<string>('ergo.passphrase')
    : undefined,
  privateKey: config.get<string>('ergo.privateKey').length
    ? config.get<string>('ergo.privateKey')
    : undefined,
  timeout: config.get<number>('ergo.node.timeout'),
};
