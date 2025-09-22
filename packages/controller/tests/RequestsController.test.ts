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
  mockFastifyConfig,
  mockedRequestHistoryAction,
  mockRequestDTO,
} from './mockUtils';
import { RequestHistoryController } from '../lib';

describe('RequestController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mockedRequestHistoryAction, 'getRequestHistory').mockResolvedValue(
      mockRequestDTO,
    );
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /request-history', async () => {
    // eslint-disable-next-line
    (FastifyAPIServer as any).instance = undefined;
    await FastifyAPIServer.initialize(mockFastifyConfig);
    const fastifyInstance = FastifyAPIServer.getInstance();

    beforeAll(async () => {
      const instance = new RequestHistoryController(
        mockedRequestHistoryAction,
        // eslint-disable-next-line
        {} as any as FastifyAPIServer,
      );
      await fastifyInstance['fastify'].register(
        instance.fetchRequestsHistoryRoute,
        {
          prefix: '/request-history',
        },
      );
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      await fastifyInstance['fastify'].close();
    });

    /**
     * Test for successful GET /request-history
     * @target RequestController.fetchRequestHistoryRoute
     * @scenario
     * - GET /request-history with valid query params
     * @expected
     * - returns 200 and the expected Request DTOs
     */
    it('should return request history successfully', async () => {
      const result = await fastifyInstance['fastify'].inject({
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
      const result = await fastifyInstance['fastify'].inject({
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
        'getRequestHistory',
      ).mockRejectedValue(new Error('Database error'));

      const result = await fastifyInstance['fastify'].inject({
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
