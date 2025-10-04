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
  mockErgoAuthConfig,
  mockFastifyServer,
  mockRedis,
  testAddress,
} from './ergoAuth.mock';

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => mockRedis),
  };
});

describe('ErgoAuth', () => {
  let ergoAuth: ErgoAuth;

  beforeAll(async () => {
    await ErgoAuth.initialize(mockErgoAuthConfig, new DummyLogger());

    ergoAuth = ErgoAuth.getInstance();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  /**
   * Test for creating a challenge and storing it in Redis
   * @target ErgoAuth.createChallenge
   * @scenario
   * - call createChallenge with a valid Ergo address
   * - mock Redis.set to return "OK"
   * @expected
   * - it should return a valid UUID v4
   * - it should call Redis.set with `challenge:<address>` and expiry 300
   */
  it('should create a challenge and store in redis', async () => {
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
   * Test for failing if no record found in Redis
   * @target ErgoAuth.verifyChallenge
   * @scenario
   * - Redis returns null for the challenge key
   * - call verifyChallenge with any challenge and signature
   * @expected
   * - should return { success: false, code: "challenge-not-found" }
   */
  it('should fail if no record in redis', async () => {
    mockRedis.get.mockResolvedValueOnce(null);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('challenge-not-found');
    }
  });

  /**
   * Test for failing when stored challenge does not match client-provided challenge
   * @target ErgoAuth.verifyChallenge
   * @scenario
   * - Redis contains a different challenge string
   * - call verifyChallenge with a mismatching challenge
   * @expected
   * - should return { success: false, code: "challenge-mismatch" }
   */
  it('should fail if challenge mismatch', async () => {
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
   * Test for failing if signature verification is invalid
   * @target ErgoAuth.verifyChallenge
   * @scenario
   * - Redis contains a valid challenge
   * - mock verifySignature to return false
   * @expected
   * - should return { success: false, code: "invalid-signature" }
   */
  it('should fail if signature is invalid', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ address: testAddress, challenge: 'abc', createdAt: 0 }),
    );

    vi.spyOn(ergoAuth, 'verifySignature').mockReturnValueOnce(false);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('invalid-signature');
  });

  /**
   * Test for successful challenge verification
   * @target ErgoAuth.verifyChallenge
   * @scenario
   * - Redis contains the same challenge as provided by the client
   * - mock verifySignature to return true
   * @expected
   * - should return { success: true }
   */
  it('should succeed with valid data', async () => {
    mockRedis.get.mockResolvedValueOnce(
      JSON.stringify({ address: testAddress, challenge: 'abc', createdAt: 0 }),
    );

    vi.spyOn(ergoAuth, 'verifySignature').mockReturnValueOnce(true);

    const result = await ergoAuth.verifyChallenge(testAddress, 'abc', 'sig');

    expect(result.success).toBe(true);
  });

  /**
   * Test for handling malformed Redis JSON
   * @target ErgoAuth.getChallengeRecord
   * @scenario
   * - Redis returns invalid JSON string
   * - call getChallengeRecord
   * @expected
   * - should return null without throwing an exception
   */
  it('should return null if redis data is malformed JSON', async () => {
    mockRedis.get.mockResolvedValueOnce('INVALID_JSON');

    const record = await ergoAuth.getChallengeRecord(testAddress);

    expect(record).toBeNull();
  });

  /**
   * Test for registering routes on the Fastify server
   * @target ErgoAuth.registerRoutes
   * @scenario
   * - call registerRoutes("/ergo-auth")
   * @expected
   * - should register exactly 3 routes (/challenge, /auth, /refresh-token)
   */
  it('should register 4 routes', async () => {
    await ergoAuth.registerRoutes('/ergo-auth');
    expect(mockFastifyServer.register).toHaveBeenCalledTimes(4);
  });

  /**
   * Test for verifying an invalid signature
   * @target ErgoAuth.verifySignature
   * @scenario
   * - call verifySignature with a fake challenge & fake signature
   * @expected
   * - should return false because signature is invalid
   */
  it('should return false for an invalid signature', () => {
    const result = ergoAuth['verifySignature'](
      '9hFQ6qGc9HnGpnyRyExV5eWh9YdNMGDNfPfqcTTegN1ctuWD1Bw',
      'fake-challenge',
      'abcd1234deadbeef',
    );

    expect(result).toBe(false);
  });

  /**
   * Test for verifying a valid signature
   * @target ErgoAuth.verifySignature
   * @scenario
   * - call verifySignature with real address, valid challenge & valid signature
   * @expected
   * - should return true (requires real valid data)
   */
  it('should return true for a valid signature (real data required)', () => {
    const result = ergoAuth['verifySignature'](
      '9ggSPfdEACEpRKMvpVwXxck9soLC1ZDmYRX9GA5gigSsAoZDNwJ',
      'a747d0c3-e5ec-4b7e-bf69-8296b2b69dad',
      'afd839fb8b13bbe7278062be30436730971f794358a0a20ab45d1ca0b7c351a35007056d4eae45cc3dbe4d611c1dd16af45bd1334e3a5f93',
    );

    expect(result).toBe(true);
  });
});
