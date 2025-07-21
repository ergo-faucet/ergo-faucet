import { vi } from 'vitest';

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
