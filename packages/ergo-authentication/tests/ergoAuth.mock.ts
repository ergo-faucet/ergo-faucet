import { vi } from 'vitest';

import { ErgoAuthConfig } from '../lib/types';

// eslint-disable-next-line
export const mockRedis: any = {
  get: vi.fn(),
  set: vi.fn(),
};

// eslint-disable-next-line
export const mockFastifyServer: any = {
  register: vi.fn(async () => {}),
  captchaPreHandler: vi.fn(),
  setAuthCookie: vi.fn(),
};

// eslint-disable-next-line
const mockUserAddressAction: any = {
  findOrCreateUserWithAddress: async () => ({ id: 1 }),
};

export const testAddress =
  '9ggSPfdEACEpRKMvpVwXxck9soLC1ZDmYRX9GA5gigSsAoZDNwJ';

export const mockErgoAuthConfig: ErgoAuthConfig = {
  redisConfig: { host: 'localhost', port: 6379 },
  fastifyServer: mockFastifyServer,
  userAddressAction: mockUserAddressAction,
  challengeExpirySeconds: 300,
  refreshTokenExpirySeconds: 3600,
  accessTokenExpirySeconds: 600,
  networkType: 0,
};
