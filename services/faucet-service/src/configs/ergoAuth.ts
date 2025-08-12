import config from 'config';

/**
 * ErgoAuth configuration
 */
export const ergoAuthConfig = {
  challengeExpirySeconds: config.get<number>('ergoAuth.challengeExpirySeconds'),
  refreshTokenExpirySeconds: config.get<number>(
    'ergoAuth.refreshTokenExpirySeconds',
  ),
  accessTokenExpirySeconds: config.get<number>(
    'ergoAuth.accessTokenExpirySeconds',
  ),
  networkType:
    config.get<string>('ergoAuth.networkAddress').toLowerCase() === 'mainnet'
      ? 0
      : 16,
};
