import { vi } from 'vitest';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { ErgoAuthConfig } from '../lib/types';

// eslint-disable-next-line
export const mockRedis: any = {
  get: vi.fn(),
  set: vi.fn(),
};

export const mockRedisConfig = { host: 'localhost', port: 6379 };

// eslint-disable-next-line
export const mockFastifyServer: any = {
  register: vi.fn(async () => {}),
  captchaPreHandler: vi.fn(),
  setAuthCookie: vi.fn(),
};

// eslint-disable-next-line
export const mockUserAddressAction: any = {
  findOrCreateUserWithAddress: async () => ({ id: 1 }),
};

export const testAddress =
  '9ggSPfdEACEpRKMvpVwXxck9soLC1ZDmYRX9GA5gigSsAoZDNwJ';

export const createMockFastifyAPIServer = () => {
  const f = FastifyAPIServer.getInstance();

  return {
    fastify: f,
    port: 3000,
    host: 'localhost',
    corsOrigins: ['*'],
    // eslint-disable-next-line
    register: vi.fn(async (callback: any, opts?: any) => {
      return f.register(callback, opts);
    }),
    setAuthCookie: vi.fn(),
    verifyCaptcha: vi.fn().mockResolvedValue(true),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
    start: vi.fn(),
    close: vi.fn(),
  } as unknown as FastifyAPIServer;
};

export const mockErgoAuthConfig: ErgoAuthConfig = {
  redisConfig: { host: 'localhost', port: 6379 },
  fastifyServer: mockFastifyServer,
  userAddressAction: mockUserAddressAction,
  challengeExpirySeconds: 300,
  refreshTokenExpirySeconds: 3600,
  accessTokenExpirySeconds: 600,
  networkType: 0,
};
