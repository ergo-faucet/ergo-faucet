import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  vi,
  afterAll,
} from 'vitest';
import { ErgoAuth } from '../lib/ErgoAuth';
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  mockFastifyServer,
  mockRedis,
  mockUserAddressAction,
  testAddress,
} from './ergoAuth.mock';

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => mockRedis),
  };
});

describe('ErgoAuth', () => {
  beforeAll(async () => {
    await ErgoAuth.initialize(
      mockRedis,
      mockFastifyServer,
      mockUserAddressAction,
      300,
      3600,
      600,
      'MAINNET',
      new DummyLogger(),
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  /**
   * Tests the `createChallenge` and `verifyChallenge` methods of ErgoAuth.
   */
  it('should create a challenge and store in redis', async () => {
    const ergoAuth = ErgoAuth.getInstance();

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

  /**
   * Tests the `verifyChallenge` method of ErgoAuth with various scenarios.
   */
  it('should fail if no record in redis', async () => {
    const ergoAuth = ErgoAuth.getInstance();

    mockRedis.get.mockResolvedValueOnce(null);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('challenge-not-found');
    }
  });

  /**
   * Tests the `verifyChallenge` method of ErgoAuth with a challenge mismatch scenario.
   */
  it('should fail if challenge mismatch', async () => {
    const ergoAuth = ErgoAuth.getInstance();

    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({
        address: testAddress,
        challenge: 'other',
        createdAt: 0,
      }),
    );

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('challenge-mismatch');
  });

  /**
   * Tests the `verifyChallenge` method of ErgoAuth with an invalid signature scenario.
   */
  it('should fail if signature is invalid', async () => {
    const ergoAuth = ErgoAuth.getInstance();

    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ address: testAddress, challenge: 'abc', createdAt: 0 }),
    );

    vi.spyOn(ergoAuth, 'verifySignature').mockReturnValueOnce(false);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('invalid-signature');
  });

  /**
   * Tests the `verifyChallenge` method of ErgoAuth with a valid challenge and signature.
   */
  it('should succeed with valid data', async () => {
    const ergoAuth = ErgoAuth.getInstance();

    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ address: testAddress, challenge: 'abc', createdAt: 0 }),
    );

    vi.spyOn(ergoAuth, 'verifySignature').mockReturnValueOnce(true);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');

    expect(result.success).toBe(true);
  });

  /**
   * Tests the `registerRoutes` method of ErgoAuth to ensure it registers the expected routes.
   */
  it('should register 3 routes', async () => {
    const ergoAuth = ErgoAuth.getInstance();
    await ergoAuth.registerRoutes('/ergo-auth');
    expect(mockFastifyServer.register).toHaveBeenCalledTimes(3);
  });
});
