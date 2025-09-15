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
  createMockedServer,
  mockedFastifyServer,
  mockedPackageAction,
  mockPackage,
  mockPackageDTO,
} from './mockUtils';
import { RequestLimitError, NotFoundError } from '@ergo-faucet/database';
import * as ergo_utils from '@ergo-faucet/ergo-utils';
import { Network } from '@fleet-sdk/common';

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
        Network.Testnet,
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

  describe('POST /packages/request', () => {
    const mockedServer = createMockedServer();

    /**
     * Register the /packages/request route before running the tests in this block.
     */
    beforeAll(async () => {
      const instance = new PackageController(
        mockedPackageAction,
        mockedFastifyServer,
        Network.Testnet,
      );
      await mockedServer.register(instance.requestPackageRoute, {
        prefix: '/packages',
      });
    });

    /**
     * Test for successful POST /packages/request
     * @target PackageController.requestPackageRoute
     * @scenario
     * - POST /packages/request with valid userId, packageId, and destAddress
     * @expected
     * - returns 200
     */
    it('should successfully request a package', async () => {
      mockedPackageAction.isPackageAvailableForUser.mockResolvedValue(true);
      vi.spyOn(ergo_utils, 'isValidErgoAddress').mockResolvedValue(true);
      mockedPackageAction.hasUserPassedAllAuthMethods.mockResolvedValue(true);
      mockedPackageAction.addUserRequest.mockResolvedValue(123);

      const result = await mockedServer.inject({
        method: 'POST',
        url: '/packages/request',
        payload: {
          packageId: 1,
          destAddress: 'test-address',
          captchaToken: 'token',
        },
      });

      expect(
        mockedPackageAction.isPackageAvailableForUser,
      ).toHaveBeenCalledWith(123, 1);
      expect(
        mockedPackageAction.hasUserPassedAllAuthMethods,
      ).toHaveBeenCalledWith(123, 1);
      expect(mockedPackageAction.addUserRequest).toHaveBeenCalledWith(
        123,
        1,
        'test-address',
      );
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({ requestId: 123 });
    });

    /**
     * Test for incomplete auth methods in POST /packages/request
     * @target PackageController.requestPackageRoute
     * @scenario
     * - POST /packages/request when user has not passed all auth methods
     * @expected
     * - returns 403 with auth methods incomplete error
     */
    it('should return 403 for incomplete auth methods', async () => {
      mockedPackageAction.isPackageAvailableForUser.mockResolvedValue(true);

      mockedPackageAction.hasUserPassedAllAuthMethods.mockResolvedValue(false);

      const result = await mockedServer.inject({
        method: 'POST',
        url: '/packages/request',
        payload: {
          packageId: 1,
          destAddress: 'test-address',
          captchaToken: 'token',
        },
      });

      expect(result.statusCode).toEqual(403);
      expect(JSON.parse(result.body)).toEqual({
        error: 'forbidden',
        code: 'AUTH_METHODS_INCOMPLETE',
      });
    });

    /**
     * Test for package or user not found in POST /packages/request
     * @target PackageController.requestPackageRoute
     * @scenario
     * - POST /packages/request when package or user is not found
     * @expected
     * - returns 404 with not found error
     */
    it('should return 404 for package or user not found', async () => {
      mockedPackageAction.isPackageAvailableForUser.mockRejectedValue(
        new NotFoundError('Package or user not found'),
      );

      const result = await mockedServer.inject({
        method: 'POST',
        url: '/packages/request',
        payload: {
          packageId: 1,
          destAddress: 'test-address',
          captchaToken: 'token',
        },
      });

      expect(result.statusCode).toEqual(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Package or user not found',
        code: 'NOT_FOUND',
      });
    });

    /**
     * Test for cooldown limit in POST /packages/request
     * @target PackageController.requestPackageRoute
     * @scenario
     * - POST /packages/request when user is under cooldown
     * @expected
     * - returns 429 with cooldown limit error
     */
    it('should return 429 for cooldown limit', async () => {
      mockedPackageAction.isPackageAvailableForUser.mockRejectedValue(
        new RequestLimitError('Cooldown limit active'),
      );

      const result = await mockedServer.inject({
        method: 'POST',
        url: '/packages/request',
        payload: {
          packageId: 1,
          destAddress: 'test-address',
          captchaToken: 'token',
        },
      });

      expect(result.statusCode).toEqual(403);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Cooldown limit active',
        code: 'REQUEST_LIMIT',
      });
    });

    /**
     * Test for internal server error in POST /packages/request
     * @target PackageController.requestPackageRoute
     * @scenario
     * - POST /packages/request when an unexpected error occurs
     * @expected
     * - returns 500 with internal server error
     */
    it('should return 500 on internal server error', async () => {
      vi.spyOn(
        mockedPackageAction,
        'isPackageAvailableForUser',
      ).mockRejectedValue(new Error('Unexpected error'));

      const result = await mockedServer.inject({
        method: 'POST',
        url: '/packages/request',
        payload: {
          packageId: 1,
          destAddress: 'test-address',
          captchaToken: 'token',
        },
      });

      expect(result.statusCode).toEqual(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error occured',
        code: 'internal-error',
      });
    });
  });
});
