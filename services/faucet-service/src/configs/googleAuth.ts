import config from 'config';
/**
 * GoogleAuth configuration
 */
export const googleAuthConfig = {
  clientId: config.get<string>('googleAuth.clientID'),
  clientSecret: config.get<string>('googleAuth.clientSecret'),
  redirectUrl: config.get<string>('googleAuth.redirectURL'),
  scope: config.get<string>('googleAuth.scope'),
  expiresTime: config.get<number>('googleAuth.expiresTime'),
  sessionTTL: config.get<number>('googleAuth.sessionTTL'),
  frontBaseURL: config.get<string>('URLs.frontCallbackURL'),
};
