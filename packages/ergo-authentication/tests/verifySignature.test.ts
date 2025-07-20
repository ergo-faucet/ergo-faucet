import { describe, it, expect, beforeAll } from 'vitest';
import { ErgoAuth } from '../lib/ErgoAuth';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

const mockRedisConfig = { host: 'localhost', port: 6379 };
// eslint-disable-next-line
const mockFastifyServer: any = {
  register: async () => {},
};
// eslint-disable-next-line
const mockUserAddressAction: any = {
  findOrCreateUserWithAddress: async () => ({ id: 1 }),
};

let ergoAuth: ErgoAuth;

beforeAll(async () => {
  await ErgoAuth.initialize(
    mockRedisConfig,
    mockFastifyServer,
    mockUserAddressAction,
    new DummyLogger(),
  );
  ergoAuth = ErgoAuth.getInstance();
});

describe('ErgoAuth.verifySignature', () => {
  it('should return false for an invalid signature', () => {
    const result = ergoAuth['verifySignature'](
      '9hFQ6qGc9HnGpnyRyExV5eWh9YdNMGDNfPfqcTTegN1ctuWD1Bw',
      'fake-challenge',
      'abcd1234deadbeef',
    );

    expect(result).toBe(false);
  });

  it('should return true for a valid signature (real data required)', () => {
    const result = ergoAuth['verifySignature'](
      '9ggSPfdEACEpRKMvpVwXxck9soLC1ZDmYRX9GA5gigSsAoZDNwJ',
      'a747d0c3-e5ec-4b7e-bf69-8296b2b69dad',
      'afd839fb8b13bbe7278062be30436730971f794358a0a20ab45d1ca0b7c351a35007056d4eae45cc3dbe4d611c1dd16af45bd1334e3a5f93',
    );

    expect(result).toBe(true);
  });
});
