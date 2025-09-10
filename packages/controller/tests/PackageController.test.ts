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
  mockConfig,
  mockedPackageAction,
  mockPackage,
  mockPackageDTO,
  mockNodeModel,
} from './mockUtils';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import {
  RequestLimitError,
  NotFoundError,
  AssetPayload,
} from '@ergo-faucet/database';
import * as ergo_utils from '@ergo-faucet/ergo-utils';
import { Network } from '@fleet-sdk/common';
import {
  InvalidTokenPrecisionError,
  TokenNotFoundError,
} from '@ergo-faucet/ergo-utils';
import { Static } from '@sinclair/typebox';
import { UserProvidedAsset } from '../lib/types';

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
      const instance = new PackageController({
        packageAction: mockedPackageAction,
        // eslint-disable-next-line
        fastifyServer: {} as any as FastifyAPIServer,
        networkType: Network.Testnet,
        nodeModel: mockNodeModel,
      });
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
      const instance = new PackageController({
        packageAction: mockedPackageAction,
        fastifyServer: mockedFastifyServer,
        networkType: Network.Testnet,
        nodeModel: mockNodeModel,
      });
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
     * - returns 403 with cooldown limit error
     */
    it('should return 403 for cooldown limit', async () => {
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

  describe('POST /packages', () => {
    let fastifyInstance: FastifyAPIServer;
    let packageController: PackageController;
    // eslint-disable-next-line
    let adminPreHandlerSpy: any;

    beforeAll(async () => {
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockConfig);
      fastifyInstance = FastifyAPIServer.getInstance();

      vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
        async (request) => {
          request.user = {
            userId: 12345,
            address: 'mocked-user-address',
            isAdmin: true,
          };
        },
      );
      packageController = new PackageController({
        packageAction: mockedPackageAction,
        fastifyServer: fastifyInstance,
        networkType: Network.Testnet,
        nodeModel: mockNodeModel,
      });

      // Set up spy before registering the route
      adminPreHandlerSpy = vi.spyOn(fastifyInstance, 'adminPreHandler');

      await fastifyInstance.register(
        packageController.addPackageRoute,
        '/packages',
      );

      await fastifyInstance.start();
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      await fastifyInstance.close();
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    /**
     * Test for successful POST /packages
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages with valid admin user and package data
     * @expected
     * - returns 200 and the package ID
     */
    it('should successfully add a package', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {});
      mockedPackageAction.addPackage.mockResolvedValue(1);
      //     mockNodeModel.getTokenById.mockResolvedValue({id: string,
      // boxId: string,
      // emissionAmount: number;
      // name: string,
      // description: string,
      // decimals: 2});

      vi.spyOn(packageController, 'processAssets').mockImplementation(
        async (
          assets: Static<typeof UserProvidedAsset>[],
        ): Promise<AssetPayload[]> => [
          {
            tokenId: assets[0].tokenId,
            amount: '10000',
            assetName: assets[0].tokenId,
            decimals: 2,
            usageDescription: assets[0].usageDescription
              ? assets[0].usageDescription
              : 'no description',
          },
        ],
      );

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: '360000',
        numberEachUser: 1,
        authMethods: [{ id: 1 }],
        assets: [
          { tokenId: 'TOKEN1', amount: '100', usageDescription: 'Test asset' },
        ],
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(fastifyInstance.authPreHandler).toHaveBeenCalled();
      expect(adminPreHandlerSpy).toHaveBeenCalled();
      expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
        12345,
      );

      expect(mockedPackageAction.validateAuthMethods).toHaveBeenCalledWith([1]);
      expect(mockedPackageAction.addPackage).toHaveBeenCalledWith({
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: '360000',
        numberEachUser: 1,
        authMethods: [{ id: 1 }],
        assets: [
          {
            tokenId: 'TOKEN1',
            assetName: 'TOKEN1',
            amount: '10000',
            decimals: 2,
            usageDescription: 'Test asset',
          },
        ],
      });
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({ packageId: 1 });
    });

    /**
     * Test for successful package addition with multiple assets and auth methods
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages with multiple assets and auth methods
     * @expected
     * - returns 200 and successfully adds package with multiple items
     */
    it('should successfully add package with multiple assets and auth methods', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {});
      mockedPackageAction.addPackage.mockResolvedValue(3);

      vi.spyOn(packageController, 'processAssets').mockResolvedValue([
        {
          tokenId: 'ERG',
          amount: '1000000000',
          assetName: 'ERG',
          decimals: 9,
          usageDescription: 'Native ERG token',
        },
        {
          tokenId: 'TOKEN1',
          amount: '50000',
          assetName: 'TOKEN1',
          decimals: 2,
          usageDescription: 'Custom token',
        },
      ]);

      const payload = {
        name: 'Multi Asset Package',
        description: 'A package with multiple assets and auth methods',
        type: 'normal',
        status: 'show',
        delay: '86400000', // 24 hours
        numberEachUser: 3,
        authMethods: [
          { id: 1, order: 1 },
          { id: 2, order: 2 },
        ],
        assets: [
          { tokenId: 'ERG', amount: '1', usageDescription: 'Native ERG token' },
          {
            tokenId: 'TOKEN1',
            amount: '500',
            usageDescription: 'Custom token',
          },
        ],
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(mockedPackageAction.validateAuthMethods).toHaveBeenCalledWith([
        1, 2,
      ]);
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({ packageId: 3 });
    });

    /**
     * Test for forbidden POST /packages
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages  with valid admin user and package data
     * @expected
     * - returns 403
     */
    it('should return 403 for non admin users', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(false);

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: 360000,
        numberEachUser: 1,
        authMethods: [{ id: 1 }],
        assets: [
          { tokenId: 'TOKEN1', amount: 100, usageDescription: 'Test asset' },
        ],
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(fastifyInstance.authPreHandler).toHaveBeenCalled();
      expect(adminPreHandlerSpy).toHaveBeenCalled();
      expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
        12345,
      );

      expect(result.statusCode).toEqual(403);
      expect(JSON.parse(result.body)).toEqual({ error: 'Forbidden' });
    });

    /**
     * Test for malformed request body in POST /packages
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages with missing required fields
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for malformed request body - missing required fields', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);

      const payload = {
        // Missing required fields: name, description, type, status, delay, numberEachUser, authMethods, assets
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(result.statusCode).toEqual(400);
      const response = JSON.parse(result.body);
      expect(response.error).toBe('Bad Request');
      expect(response.code).toBe('FST_ERR_VALIDATION');
    });

    /**
     * Test for TokenNotFoundError in POST /packages
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages when token is not found
     * @expected
     * - returns 400 with TOKEN_NOT_FOUND error
     */
    it('should return 400 for token not found error', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {});

      vi.spyOn(packageController, 'processAssets').mockRejectedValue(
        new TokenNotFoundError('Token with id INVALID_TOKEN not found'),
      );

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: 360000,
        numberEachUser: 1,
        authMethods: [{ id: 1 }],
        assets: [
          {
            tokenId: 'INVALID_TOKEN',
            amount: 100,
            usageDescription: 'Test asset',
          },
        ],
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Token Not Found error : Token with id INVALID_TOKEN not found',
        code: 'TOKEN_NOT_FOUND',
      });
    });

    /**
     * Test for InvalidTokenPrecisionError in POST /packages
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages when token amount has invalid precision
     * @expected
     * - returns 400 with INVALID_PRECISION error
     */
    it('should return 400 for invalid token precision error', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {});

      vi.spyOn(packageController, 'processAssets').mockRejectedValue(
        new InvalidTokenPrecisionError(
          'Amount has too many decimal places. Token supports up to 2 decimal places, but received 3.',
        ),
      );

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: 360000,
        numberEachUser: 1,
        authMethods: [{ id: 1 }],
        assets: [
          {
            tokenId: 'TOKEN1',
            amount: 100.123,
            usageDescription: 'Test asset',
          },
        ],
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error:
          'Invalid Token Precision error : Amount has too many decimal places. Token supports up to 2 decimal places, but received 3.',
        code: 'INVALID_PRECISION',
      });
    });

    /**
     * Test for auth methods not found in POST /packages
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages when auth methods are not found in database
     * @expected
     * - returns 400 with AUTH_NOT_FOUND error
     */
    it('should return 400 for auth methods not found', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {
        throw new NotFoundError('Some auth methods not found for IDs: [999]');
      });

      vi.spyOn(packageController, 'processAssets').mockResolvedValue([
        {
          tokenId: 'ERG',
          amount: '1000000000',
          assetName: 'ERG',
          decimals: 9,
          usageDescription: 'Test asset',
        },
      ]);

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: 360000,
        numberEachUser: 1,
        authMethods: [{ id: 999 }], // Non-existent auth method
        assets: [{ tokenId: 'ERG', amount: 1, usageDescription: 'Test asset' }],
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Some auth methods not found for IDs: [999]',
        code: 'AUTH_NOT_FOUND',
      });
    });

    /**
     * Test for database error during package addition in POST /packages
     * @target PackageController.addPackageRoute
     * @scenario
     * - POST /packages when database error occurs during package addition
     * @expected
     * - returns 500 with internal server error
     */
    it('should return 500 for database error during package addition', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {});
      mockedPackageAction.addPackage.mockRejectedValue(
        new Error('Database connection error'),
      );

      vi.spyOn(packageController, 'processAssets').mockResolvedValue([
        {
          tokenId: 'ERG',
          assetName: 'ERG',
          amount: '1000000000',
          decimals: 9,
          usageDescription: 'Test asset',
        },
      ]);

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: 360000,
        numberEachUser: 1,
        authMethods: [{ id: 1 }],
        assets: [{ tokenId: 'ERG', amount: 1, usageDescription: 'Test asset' }],
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(result.statusCode).toEqual(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error occurred',
        code: 'internal-error',
      });
    });
  });

  describe('processAssets', () => {
    let packageController: PackageController;

    beforeEach(() => {
      vi.clearAllMocks();
      packageController = new PackageController({
        packageAction: mockedPackageAction,
        fastifyServer: mockedFastifyServer,
        networkType: Network.Testnet,
        nodeModel: mockNodeModel,
      });
    });

    /**
     * Test for successful processing of assets with ERG token
     * @target PackageController.processAssets
     * @scenario
     * - Process assets with ERG token
     * @expected
     * - Correctly converts ERG amount and returns processed assets
     */
    it('should successfully process ERG token', async () => {
      const assets = [
        { tokenId: 'ERG', amount: '1.5', usageDescription: 'Test ERG' },
      ];

      const result = await packageController.processAssets(assets);

      expect(result).toEqual([
        {
          tokenId: 'ERG',
          assetName: 'ERG',
          amount: '1500000000',
          decimals: 9,
          usageDescription: 'Test ERG',
        },
      ]);
    });

    /**
     * Test for successful processing of non-ERG token
     * @target PackageController.processAssets
     * @scenario
     * - Process assets with non-ERG token and valid decimals
     * @expected
     * - Correctly converts amount based on token decimals
     */
    it('should successfully process non-ERG token', async () => {
      mockNodeModel.getTokenById.mockResolvedValue({
        id: 'TOKEN1',
        boxId: 'mock-box-id',
        emissionAmount: 1234,
        name: 'TOKEN1',
        description: 'no description',
        decimals: 2,
      });
      const assets = [
        { tokenId: 'TOKEN1', amount: '100.25', usageDescription: 'Test token' },
      ];

      const result = await packageController.processAssets(assets);

      expect(mockNodeModel.getTokenById).toHaveBeenCalledWith('TOKEN1');

      expect(result).toEqual([
        {
          tokenId: 'TOKEN1',
          assetName: 'TOKEN1',
          amount: '10025',
          decimals: 2,
          usageDescription: 'Test token',
        },
      ]);
    });

    /**
     * Test for TokenNotFoundError in processAssets
     * @target PackageController.processAssets
     * @scenario
     * - Process assets with invalid token ID
     * @expected
     * - Throws TokenNotFoundError
     */
    it('should throw TokenNotFoundError for invalid token', async () => {
      mockNodeModel.getTokenById.mockRejectedValue(
        new TokenNotFoundError('Token not found'),
      );
      const assets = [
        {
          tokenId: 'INVALID_TOKEN',
          amount: '100',
          usageDescription: 'Test token',
        },
      ];

      await expect(packageController.processAssets(assets)).rejects.toThrow(
        TokenNotFoundError,
      );
    });

    /**
     * Test for InvalidTokenPrecisionError in processAssets
     * @target PackageController.processAssets
     * @scenario
     * - Process assets with amount exceeding token precision
     * @expected
     * - Throws InvalidTokenPrecisionError
     */
    it('should throw InvalidTokenPrecisionError for invalid precision', async () => {
      mockNodeModel.getTokenById.mockResolvedValue({
        id: 'TOKEN1',
        boxId: 'mock-box-id',
        emissionAmount: 1234,
        name: 'TOKEN1',
        description: 'mock-description',
        decimals: 2,
      });
      const assets = [
        {
          tokenId: 'TOKEN1',
          amount: '100.123',
          usageDescription: 'Test token',
        },
      ];

      await expect(packageController.processAssets(assets)).rejects.toThrow(
        InvalidTokenPrecisionError,
      );
    });
  });
});
