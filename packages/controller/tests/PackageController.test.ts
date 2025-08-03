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
  mockedServer,
  mockPackage,
  mockPackageDtos,
} from './mockUtils';

describe('PackageController', () => {
  /**
   * Reset PackageController singleton before each test to ensure a clean state.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line
    (PackageController as any).instance = undefined;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test for initializing the PackageController successfully
   * @target PackageController.initialize
   * @scenario
   * - Call initialize with a mocked PackageAction
   * - Retrieve instance via getInstance
   * @expected
   * - getInstance returns an instance of PackageController
   */
  it('should initialize the PackageController instance', async () => {
    await PackageController.initialize(mockedPackageAction);
    const instance = PackageController.getInstance();
    expect(instance).toBeInstanceOf(PackageController);
  });

  describe('GET /packages', async () => {
    /**
     * Register the /packages route before running the tests in this block.
     */
    beforeAll(async () => {
      const instance = PackageController.getInstance();
      await mockedServer.register(instance.fetchPackagesRoute, {
        prefix: '/packages',
      });
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
        url: '/packages?offset=0&limit=10&sort=name&order=desc',
      });

      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(mockPackageDtos);
    });

    /**
     * Test for GET /packages returning 404 when no packages found
     * @target PackageController.fetchPackagesRoute
     * @scenario
     * - GET /packages when getPackages returns []
     * @expected
     * - returns 404 and error message
     */
    it('should return 404 if no packages found', async () => {
      vi.spyOn(mockedPackageAction, 'getPackages').mockResolvedValue([]);
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/packages?offset=0&limit=10&sort=name&order=desc',
      });

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'No packages found matching the query parameters.',
        code: 'NOT_FOUND',
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
