import { CookieConfig } from '@ergo-faucet/fastify-server';
import config from 'config';

/**
 * Fastify server configuration
 */
export const serverConfig = {
  port: config.get<number>('server.port'),
  host: config.get<string>('server.host'),
  corsOrigins: config.get<string | string[]>('server.corsOrigins'),
  jwtSecret: config.get<string>('server.jwtSecret'),
  jwtExpiration: config.get<number>('server.jwtExpiration'),
  activeFastifyLogger: config.get<boolean>('server.activeFastifyLogger'),
};

/**
 * Cookie configuration
 */
export const cookieConfig: CookieConfig = {
  secret: config.get<string>('cookie.secret'),
  signed: config.get<boolean>('cookie.signed'),
  name: config.get<string>('cookie.name'),
  httpOnly: config.get<boolean>('cookie.httpOnly'),
  secure: config.get<boolean>('cookie.secure'),
  sameSite: config.get<'strict' | 'lax' | 'none'>('cookie.sameSite'),
  path: config.get<string>('cookie.path'),
  domain: config.get<string>('cookie.domain'),
  maxAge: config.get<number>('cookie.maxAge'),
};

/**
 * Swagger configuration
 */
export const swaggerConfig = config.get<object>('swagger');
export const swaggerUiConfig = config.get<object>('swaggerUi');
