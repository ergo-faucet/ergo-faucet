import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterAll,
  beforeAll,
} from 'vitest';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import {
  createMockedServer,
  mockedRequestHistoryAction,
  mockRequest,
  mockRequestDTO,
} from './mockUtils';
import { RequestController } from '../lib';

describe('RequestController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /request-history', async () => {
    const mockedServer = createMockedServer();

    beforeAll(async () => {
      const instance = new RequestController(
        mockedRequestHistoryAction,
        // eslint-disable-next-line
        {} as any as FastifyAPIServer,
      );
      await mockedServer.register(instance.fetchRequestsHistoryRoute, {
        prefix: '/request-history',
      });
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      await mockedServer.close();
    });

    // Default mock for getRequestHistory
    vi.spyOn(mockedRequestHistoryAction, 'getRequestHistoty').mockResolvedValue(
      [mockRequest],
    );

    /**
     * Test for successful GET /request-history
     * @target RequestController.fetchRequestHistoryRoute
     * @scenario
     * - GET /request-history with valid query params
     * @expected
     * - returns 200 and the expected Request DTOs
     */
    it('should return request history successfully', async () => {
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/request-history?offset=0&limit=100&sort=timestamp&order=desc',
      });

      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(mockRequestDTO);
    });

    /**
     * Test for Bad Request GET /request-history
     * @target RequestController.fetchRequestHistoryRoute
     * @scenario
     * - GET /request-history with invalid query params
     * @expected
     * - returns 400
     */
    it('should return Bad Request on invalid query params', async () => {
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/request-history?limit=200', // limit > 100
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toMatchObject({
        code: 'FST_ERR_VALIDATION',
        error: 'Bad Request',
      });
    });

    /**
     * Test for GET /request-history returning 500 on internal error
     * @target RequestController.fetchRequestHistoryRoute
     * @scenario
     * - GET /request-history when getRequestHistory throws
     * @expected
     * - returns 500 and error message
     */
    it('should return 500 on internal server error', async () => {
      vi.spyOn(
        mockedRequestHistoryAction,
        'getRequestHistoty',
      ).mockRejectedValue(new Error('Database error'));

      const result = await mockedServer.inject({
        method: 'GET',
        url: '/request-history?offset=0&limit=10&sort=timestamp&order=desc',
      });

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error occured',
        code: 'internal-error',
      });
    });
  });
});
