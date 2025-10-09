import config from 'config';

/**
 * XAuth configuration
 */
export const xAuthConfig = {
  clientID: config.get<string>('x-platform.clientID'),
  clientSecret: config.get<string>('x-platform.clientSecret'),
  redirectURL: config.get<string>('x-platform.redirectURL'),
  scope: config.get<string>('x-platform.scope'),
  expiresTime: config.get<number>('x-platform.expiresTime'),
  sessionTTL: config.get<number>('x-platform.sessionTTL'),
  frontBaseURL: config.get<string>('URLs.frontCallbackURL'),
};
