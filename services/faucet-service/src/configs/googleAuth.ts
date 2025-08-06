import config from 'config';
/**
 * GoogleAuth configuration
 */
export const googleAuthConfig = {
  clientId: config.get<string>('googleAuth.clientId'),
  clientSecret: config.get<string>('googleAuth.clientSecret'),
  redirectUrl: config.get<string>('googleAuth.redirectUrl'),
  scope: config.get<string>('googleAuth.scope'),
  expiresTime: config.get<number>('googleAuth.expiresTime'),
  sessionTTL: config.get<number>('googleAuth.sessionTTL'),
};
