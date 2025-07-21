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
   * Tests `createChallenge` stores proper UUID in Redis
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
   * Should fail if no record found in Redis
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
   * Should fail on challenge mismatch
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
   * Should fail if signature invalid
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
   *  Should succeed with valid challenge & valid signature
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
   *  Should gracefully handle JSON parse errors in getChallengeRecord
   */
  it('should return null if redis data is malformed JSON', async () => {
    const ergoAuth = ErgoAuth.getInstance();

    mockRedis.get.mockResolvedValueOnce('INVALID_JSON');

    const record = await ergoAuth.getChallengeRecord(testAddress);

    expect(record).toBeNull();
  });

  /**
   * Should validate MAINNET vs TESTNET correctly
   */
  it('should reject TESTNET address when running on MAINNET', () => {
    const ergoAuth = ErgoAuth.getInstance();

    // This is a valid TESTNET prefix address (network byte 0x10)
    const testnetAddress =
      '3WxrAftnTJSGP91VEhRQWYviUG26XQNoPKciqqcBD86VPVS5Zn13';
    const isValid = ergoAuth.isvalidErgoAddress(testnetAddress);

    expect(isValid).toBe(false);
  });

  it('should accept valid MAINNET address', () => {
    const ergoAuth = ErgoAuth.getInstance();

    const mainnetAddr = '9fq3mgbL6UgzV33dC4R2n8L3CFSrBUytME8JKD8xDKgj8BDTLX7';
    const isValid = ergoAuth.isvalidErgoAddress(mainnetAddr);

    expect(isValid).toBe(true);
  });

  /**
   * Should register exactly 3 routes (/challenge, /auth, /refresh-token)
   */
  it('should register 3 routes', async () => {
    const ergoAuth = ErgoAuth.getInstance();
    await ergoAuth.registerRoutes('/ergo-auth');
    expect(mockFastifyServer.register).toHaveBeenCalledTimes(3);
  });
});
