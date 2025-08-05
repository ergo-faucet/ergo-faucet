import { CookieConfig } from '@ergo-faucet/fastify-server';
import config from 'config';

/**
 * Cookie configuration
 */
export const cookieConfig: CookieConfig = {
  secret: config.get<string>('server.cookie.secret'),
  signed: config.get<boolean>('server.cookie.signed'),
  name: config.get<string>('server.cookie.name'),
  httpOnly: config.get<boolean>('server.cookie.httpOnly'),
  secure: config.get<boolean>('server.cookie.secure'),
  sameSite: config.get<'strict' | 'lax' | 'none'>('server.cookie.sameSite'),
  path: config.get<string>('server.cookie.path'),
  domain: config.get<string>('server.cookie.domain'),
  maxAge: config.get<number>('server.cookie.maxAge'),
};

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
  swagger: config.get<object>('server.swagger'),
  swaggerUi: config.get<object>('server.swaggerUi'),
  cookie: cookieConfig,
};
