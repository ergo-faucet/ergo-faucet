import config from 'config';

/**
 * XAuth configuration
 */
export const xAuthConfig = {
  clientID: config.get<string>('x.clientID'),
  clientSecret: config.get<string>('x.clientSecret'),
  redirectURL: config.get<string>('x.redirectURL'),
  scope: config.get<string>('x.scope'),
  expiresTime: config.get<number>('x.expiresTime'),
  sessionTTL: config.get<number>('x.sessionTTL'),
};
