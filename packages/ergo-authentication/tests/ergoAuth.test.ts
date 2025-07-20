import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { ErgoAuth } from '../lib/ErgoAuth';

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockFastifyServer = {
  register: vi.fn(async () => {}),
  captchaPreHandler: vi.fn(),
  setAuthCookie: vi.fn(),
};

const mockUserAddressAction = {
  findOrCreateUserWithAddress: vi.fn(async (addr: string) => ({
    id: 123,
    address: addr,
  })),
};

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};

const testAddress = '9ggSPfdEACEpRKMvpVwXxck9soLC1ZDmYRX9GA5gigSsAoZDNwJ';

describe('ErgoAuth Singleton Initialization', () => {
  beforeAll(async () => {
    await ErgoAuth.initialize(
      // eslint-disable-next-line
      {} as any,
      // eslint-disable-next-line
      mockFastifyServer as any,
      // eslint-disable-next-line
      mockUserAddressAction as any,
      // eslint-disable-next-line
      mockLogger as any,
      300,
      3600,
      600,
    );
  });

  it('should throw if initialized again', async () => {
    await expect(() =>
      ErgoAuth.initialize(
        // eslint-disable-next-line
        {} as any,
        // eslint-disable-next-line
        mockFastifyServer as any,
        // eslint-disable-next-line
        mockUserAddressAction as any,
      ),
    ).rejects.toThrowError('ErgoAuth has already been initialized.');
  });

  it('getInstance should return a valid instance', () => {
    const instance = ErgoAuth.getInstance();
    expect(instance).toBeInstanceOf(ErgoAuth);
  });
});

describe('ErgoAuth Core Functions', () => {
  // eslint-disable-next-line
  let ergoAuth: any;

  beforeEach(() => {
    // eslint-disable-next-line
    ergoAuth = ErgoAuth.getInstance() as any;
    vi.clearAllMocks();
  });

  it('createChallenge should store a uuid in redis', async () => {
    ergoAuth.redis = mockRedis;
    mockRedis.set.mockResolvedValueOnce('OK');

    const challenge = await ergoAuth.createChallenge(testAddress);

    expect(challenge).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      `challenge:${testAddress}`,
      expect.stringContaining(challenge),
      'EX',
      300,
    );
  });

  it('verifyChallenge should fail if no record in redis', async () => {
    ergoAuth.redis = mockRedis;
    mockRedis.get.mockResolvedValueOnce(null);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');
    expect(result.success).toBe(false);
    expect(result.code).toBe('challenge-not-found');
  });

  it('verifyChallenge should fail if challenge mismatch', async () => {
    ergoAuth.redis = mockRedis;
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({
        address: testAddress,
        challenge: 'other',
        createdAt: 0,
      }),
    );

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');
    expect(result.success).toBe(false);
    expect(result.code).toBe('challenge-mismatch');
  });

  it('verifyChallenge should fail if signature is invalid', async () => {
    ergoAuth.redis = mockRedis;
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ address: testAddress, challenge: 'abc', createdAt: 0 }),
    );
    vi.spyOn(ergoAuth, 'verifySignature').mockReturnValueOnce(false);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');
    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid-signature');
  });

  it('verifyChallenge should succeed with valid data', async () => {
    ergoAuth.redis = mockRedis;
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ address: testAddress, challenge: 'abc', createdAt: 0 }),
    );
    vi.spyOn(ergoAuth, 'verifySignature').mockReturnValueOnce(true);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');
    expect(result.success).toBe(true);
  });
});

describe('ErgoAuth Route Registration', () => {
  it('should register 3 routes', async () => {
    // eslint-disable-next-line
    const instance = ErgoAuth.getInstance() as any;
    await instance.registerRoutes('/ergo-auth');
    expect(mockFastifyServer.register).toHaveBeenCalledTimes(3);
  });
});
