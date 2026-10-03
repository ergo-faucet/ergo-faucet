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
  privateKey: config.has('ergo.privateKey')
    ? config.get<string>('ergo.privateKey')
    : undefined,
  mnemonic:
    config.has('ergo.mnemonic') && !config.has('ergo.privateKey')
      ? config.get<string>('ergo.mnemonic')
      : undefined,
  passphrase:
    config.has('ergo.passphrase') && !config.has('ergo.privateKey')
      ? config.get<string>('ergo.passphrase')
      : undefined,
  timeout: config.get<number>('ergo.node.timeout'),
  scriptName: config.get<string>('ergo.scriptName'),
};
