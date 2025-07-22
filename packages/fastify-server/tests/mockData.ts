import { vi } from 'vitest';
import { ServerConfig } from '../lib';
import {
  GoogleRecaptcha,
  RecaptchaServerError,
} from '@ergo-faucet/google-recaptcha';

export const setupGoogleRecaptchaMock = () => {
  vi.mock('@ergo-faucet/google-recaptcha', () => {
    class MockRecaptchaServerError extends Error {
      name = 'RecaptchaServerError';
    }
    class MockRecaptchaClientError extends Error {
      name = 'RecaptchaClientError';
    }

    return {
      GoogleRecaptcha: vi.fn().mockImplementation(() => ({
        verifyToken: vi.fn(async (token: string) => {
          if (token === 'valid_token') return true;
          if (token === 'server_error')
            throw new MockRecaptchaServerError('Simulated server error');
          if (token === 'error_token')
            throw new MockRecaptchaServerError('Test error');
          return false;
        }),
        logger: console,
        recaptchaKey: 'fake-key',
        threshold: 0.5,
        hostnames: ['localhost'],
      })),
      RecaptchaServerError: MockRecaptchaServerError,
      RecaptchaClientError: MockRecaptchaClientError,
    };
  });
};

export const mockGoogleRecaptcha: GoogleRecaptcha & {
  verifyToken: ReturnType<typeof vi.fn>;
} = {
  verifyToken: vi.fn(async (token: string) => {
    if (token === 'valid_token') return true;
    if (token === 'error_token') throw new RecaptchaServerError('Test error');
    return false;
  }),
  logger: console,
  recaptchaKey: 'fake-key',
  threshold: 0.5,
  hostnames: ['localhost'],
  // eslint-disable-next-line
} as any;

export const config: ServerConfig = {
  port: 3000,
  host: 'localhost',
  corsOrigins: '*',
  jwtSecret: 'test_secret',
  jwtExpiration: 300,
  googleRecaptcha: mockGoogleRecaptcha,
  swagger: {
    exposeHeadRoutes: true,
    openapi: {
      info: {
        title: 'Test API',
        description: 'API Documentation',
        version: '1.0.0',
      },
    },
  },
  swaggerUi: {
    routePrefix: '/docs',
  },
  activeFastifyLogger: false,
  cookie: {
    secret: 'test_cookie_secret',
    name: 'auth_token',
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600,
    domain: 'localhost',
    signed: false,
  },
};
