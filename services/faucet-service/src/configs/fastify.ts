import { CookieConfig } from '@ergo-faucet/fastify-server';
import config from 'config';
import packageJson from 'package.json' assert { type: 'json' };
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
 * Swagger/OpenAPI configuration with cookie authentication
 */
const swagger = {
  openapi: {
    info: {
      title: 'Faucet Service API',
      description: 'API documentation for Faucet Service',
      version: packageJson.version,
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey' as const,
          in: 'cookie' as const,
          name: cookieConfig.name,
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
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
  swagger: swagger,

  swaggerUi: config.get<object>('server.swaggerUi'),
  cookie: cookieConfig,
};
