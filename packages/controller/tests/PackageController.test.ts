import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterAll,
  beforeAll,
} from 'vitest';
import { PackageController } from '../lib';
import {
  mockedPackageAction,
  createMockedServer,
  mockedFastifyServer,
  mockPackage,
  mockPackageDTO,
} from './mockUtils';

describe('PackageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /packages', async () => {
    const mockedServer = createMockedServer();
    /**
     * Register the /packages route before running the tests in this block.
     */
    beforeAll(async () => {
      const instance = new PackageController(
        mockedPackageAction,
        mockedFastifyServer,
      );
      await mockedServer.register(instance.fetchPackagesRoute, {
        prefix: '/packages',
      });
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      await mockedServer.close();
    });

    // Default mock for getPackages to return a package
    vi.spyOn(mockedPackageAction, 'getPackages').mockResolvedValue([
      mockPackage,
    ]);

    /**
     * Test for successful GET /packages
     * @target PackageController.fetchPackagesRoute
     * @scenario
     * - GET /packages with valid query params
     * @expected
     * - returns 200 and the expected package DTOs
     */
    it('should returns packages successfully', async () => {
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/packages?offset=0&limit=100&sort=name&order=desc',
      });

      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(mockPackageDTO);
    });

    /**
     * Test for Bad Request GET /packages
     * @target PackageController.fetchPackagesRoute
     * @scenario
     * - GET /packages with invalid query params
     * @expected
     * - returns 400
     */
    it('should returns Bad Request', async () => {
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/packages?offset=0&limit=200&sort=name&order=desc', //limit is greater than maximum 100
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'FST_ERR_VALIDATION',
        error: 'Bad Request',
        message: 'querystring/limit must be <= 100',
        statusCode: 400,
      });
    });

    /**
     * Test for GET /packages returning 500 on internal error
     * @target PackageController.fetchPackagesRoute
     * @scenario
     * - GET /packages when getPackages throws
     * @expected
     * - returns 500 and error message
     */
    it('should return 500 on internal server error', async () => {
      vi.spyOn(mockedPackageAction, 'getPackages').mockRejectedValue(
        new Error('Database error'),
      );
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/packages?offset=0&limit=10&sort=name&order=desc',
      });

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error occured',
        code: 'internal-error',
      });
    });
  });
});
