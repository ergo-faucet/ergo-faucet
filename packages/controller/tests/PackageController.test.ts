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
  mockFastifyConfig,
  mockedPackageAction,
  mockPackageDTO,
  mockNodeModel,
  mockPackage,
} from './mockUtils';
import { RequestLimitError, NotFoundError } from '@ergo-faucet/database';
import * as ergo_utils from '@ergo-faucet/ergo-utils';
import { Network } from '@fleet-sdk/common';
import {
  InvalidTokenPrecisionError,
  TokenNotFoundError,
} from '@ergo-faucet/ergo-utils';
import { FastifyAPIServer, FastifyRequest } from '@ergo-faucet/fastify-server';
import * as utils from '../lib/utils';
import {
  mockAssets,
  mockProccessedAssets,
  requestPackagePayload,
} from './testData';

describe('PackageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /packages', async () => {
    let fastifyInstance: FastifyAPIServer;
    let packageController: PackageController;

    beforeAll(async () => {
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockFastifyConfig);
      fastifyInstance = FastifyAPIServer.getInstance();

      packageController = new PackageController({
        packageAction: mockedPackageAction,
        fastifyServer: fastifyInstance,
        networkType: Network.Testnet,
        nodeModel: mockNodeModel,
      });

      await fastifyInstance.register(
        packageController.fetchPackagesRoute,
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

    // Default mock for getPackages to return a package
    vi.spyOn(mockedPackageAction, 'getPackages').mockImplementation(
      async () => mockPackageDTO,
    );

    /**
     * Test for successful GET /packages
     * @target PackageController.fetchPackagesRoute
     * @scenario
     * - GET /packages with valid query params
     * @expected
     * - returns 200 and the expected package DTOs
     */
    it('should returns packages successfully', async () => {
      const result = await fastifyInstance['fastify'].inject({
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
      const result = await fastifyInstance['fastify'].inject({
        method: 'GET',
        url: '/packages?offset=0&limit=200&sort=name&order=desc', //limit is greater than maximum 100
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'Bad Request',
        error: 'querystring/limit must be <= 100',
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
      const result = await fastifyInstance['fastify'].inject({
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
    let fastifyInstance: FastifyAPIServer;
    let packageController: PackageController;

    beforeAll(async () => {
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockFastifyConfig);
      fastifyInstance = FastifyAPIServer.getInstance();

      vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
        (verifyAndEnforce: boolean = true) => {
          return async (request: FastifyRequest) => {
            if (!verifyAndEnforce) return;
            else {
              // Simulate JWT verification and set request.user
              request.user = {
                userId: 123,
                address: 'mocked-user-address',
                isAdmin: true,
              };
            }
          };
        },
      );

      vi.spyOn(fastifyInstance, 'captchaPreHandler').mockImplementation(
        async () => {},
      );

      packageController = new PackageController({
        packageAction: mockedPackageAction,
        fastifyServer: fastifyInstance,
        networkType: Network.Testnet,
        nodeModel: mockNodeModel,
      });

      await fastifyInstance.register(
        packageController.requestPackageRoute,
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

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/request',
        payload: requestPackagePayload,
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

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/request',
        payload: requestPackagePayload,
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

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/request',
        payload: requestPackagePayload,
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

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/request',
        payload: requestPackagePayload,
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

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/request',
        payload: requestPackagePayload,
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
      await FastifyAPIServer.initialize(mockFastifyConfig);
      fastifyInstance = FastifyAPIServer.getInstance();

      vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
        (verifyAndEnforce: boolean = true) => {
          return async (request: FastifyRequest) => {
            if (!verifyAndEnforce) return;
            else {
              // Simulate JWT verification and set request.user
              request.user = {
                userId: 12345,
                address: 'mocked-user-address',
                isAdmin: true,
              };
            }
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
      mockedPackageAction.addPackage.mockResolvedValue(1);

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: '360000',
        numberEachUser: 1,
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

      expect(adminPreHandlerSpy).toHaveBeenCalled();
      expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
        12345,
      );

      expect(mockedPackageAction.addPackage).toHaveBeenCalledWith({
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: '360000',
        numberEachUser: 1,
      });
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({ packageId: 1 });
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
      };

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages',
        payload,
      });

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
      expect(response.code).toBe('Bad Request');
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

      mockedPackageAction.addPackage.mockRejectedValue(
        new Error('Database connection error'),
      );

      const payload = {
        name: 'Test Package',
        description: 'A test package',
        type: 'normal',
        status: 'show',
        delay: 360000,
        numberEachUser: 1,
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

  describe('POST /packages/:packageId/assets', () => {
    let fastifyInstance: FastifyAPIServer;
    let packageController: PackageController;
    // eslint-disable-next-line
    let adminPreHandlerSpy: any;

    beforeAll(async () => {
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockFastifyConfig);
      fastifyInstance = FastifyAPIServer.getInstance();

      vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
        (verifyAndEnforce: boolean = true) => {
          return async (request: FastifyRequest) => {
            if (!verifyAndEnforce) return;
            else {
              // Simulate JWT verification and set request.user
              request.user = {
                userId: 12345,
                address: 'mocked-user-address',
                isAdmin: true,
              };
            }
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
        packageController.addAssetsToPackageRoute,
        '/packages',
      );

      await fastifyInstance.start();
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      await fastifyInstance.close();
    });

    /**
     * Test for successful POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/1/assets with valid admin user, existing package, valid assets (ERG and token)
     * @expected
     * - returns 200 with addedAssets array
     */
    it('should successfully add assets to package', async () => {
      const assets = [mockAssets[0], mockAssets[1]];

      const proccessedAssets = [
        mockProccessedAssets[0],
        mockProccessedAssets[1],
      ];

      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockResolvedValue(mockPackage);
      vi.spyOn(utils, 'processAssets').mockResolvedValue(proccessedAssets);
      mockedPackageAction.addAssets.mockResolvedValue([1, 2]);

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/assets',
        payload: assets,
      });

      expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
        12345,
      );
      expect(mockedPackageAction.getPackageById).toHaveBeenCalledWith(1);
      expect(utils.processAssets).toHaveBeenCalledWith(assets, mockNodeModel);
      expect(mockedPackageAction.addAssets).toHaveBeenCalledWith(
        proccessedAssets,
        mockPackage,
      );
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({ addedAssets: [1, 2] });
    });

    /**
     * Test for schema validation failure in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/1/assets with invalid body (non-array or invalid fields)
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for invalid body schema', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/assets',
        payload: { invalid: 'body' }, // Not an array
      });

      expect(result.statusCode).toEqual(400);

      expect(JSON.parse(result.body)).toEqual({
        code: 'Bad Request',
        error: 'body must be array',
      });
    });

    /**
     * Test for missing packageId param in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/assets with missing packageId param
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for missing packageId param', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/assets',
        payload: [{ tokenId: 'ERG', amount: '1' }],
      });

      expect(result.statusCode).toEqual(404);

      expect(JSON.parse(result.body)).toEqual({
        error: 'Not Found',
        message: 'Route POST:/packages/assets not found',
        statusCode: 404,
      });
    });

    /**
     * Test for invalid packageId param in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/invalid/assets with non-number packageId
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for invalid packageId param', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/invalid/assets',
        payload: [{ tokenId: 'ERG', amount: '1' }],
      });

      expect(result.statusCode).toEqual(400);

      expect(JSON.parse(result.body)).toEqual({
        code: 'Bad Request',
        error: 'params/packageId must be number',
      });
    });

    /**
     * Test for forbidden (non-admin) in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/1/assets with non-admin user
     * @expected
     * - returns 403 with Forbidden error
     */
    it('should return 403 for non-admin user', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(false);

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/assets',
        payload: [{ tokenId: 'ERG', amount: '1' }],
      });

      expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
        12345,
      );
      expect(result.statusCode).toEqual(403);
      expect(JSON.parse(result.body)).toEqual({ error: 'Forbidden' });
    });

    /**
     * Test for package not found in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/999/assets when package does not exist
     * @expected
     * - returns 404 with PACKAGE_NOT_FOUND error
     */
    it('should return 404 for package not found', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockRejectedValue(
        new NotFoundError('Package not found'),
      );

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/999/assets',
        payload: [{ tokenId: 'ERG', amount: 1 }],
      });

      expect(mockedPackageAction.getPackageById).toHaveBeenCalledWith(999);
      expect(result.statusCode).toEqual(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Package not found',
        code: 'PACKAGE_NOT_FOUND',
      });
    });

    /**
     * Test for token not found in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/1/assets with invalid tokenId
     * @expected
     * - returns 400 with TOKEN_NOT_FOUND error
     */
    it('should return 400 for token not found', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockResolvedValue(mockPackage);
      vi.spyOn(utils, 'processAssets').mockRejectedValue(
        new TokenNotFoundError('Token with id INVALID_TOKEN not found'),
      );

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/assets',
        payload: [{ tokenId: 'INVALID_TOKEN', amount: '1' }],
      });

      expect(utils.processAssets).toHaveBeenCalledWith(
        [{ tokenId: 'INVALID_TOKEN', amount: '1' }],
        mockNodeModel,
      );
      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Token Not Found error : Token with id INVALID_TOKEN not found',
        code: 'TOKEN_NOT_FOUND',
      });
    });

    /**
     * Test for invalid token precision in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/1/assets with amount exceeding token decimals
     * @expected
     * - returns 400 with INVALID_PRECISION error
     */
    it('should return 400 for invalid token precision', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockResolvedValue(mockPackage);
      vi.spyOn(utils, 'processAssets').mockRejectedValue(
        new InvalidTokenPrecisionError(
          'Amount has too many decimal places. Token supports up to 2 decimal places, but received 3.',
        ),
      );

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/assets',
        payload: [{ tokenId: 'TOKEN1', amount: 1.234 }],
      });

      expect(utils.processAssets).toHaveBeenCalledWith(
        [{ tokenId: 'TOKEN1', amount: '1.234' }],
        mockNodeModel,
      );
      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error:
          'Invalid Token Precision error : Amount has too many decimal places. Token supports up to 2 decimal places, but received 3.',
        code: 'INVALID_PRECISION',
      });
    });

    /**
     * Test for internal server error in POST /packages/:packageId/assets
     * @target PackageController.addAssetsToPackageRoute
     * @scenario
     * - POST /packages/1/assets when addAssets throws unexpected error
     * @expected
     * - returns 500 with internal server error
     */
    it('should return 500 on internal server error during addAssets', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockResolvedValue(mockPackage);
      vi.spyOn(utils, 'processAssets').mockResolvedValue([
        {
          tokenId: 'ERG',
          assetName: 'ERG',
          amount: '1000000000',
          decimals: 9,
          usageDescription: 'Test',
        },
      ]);
      mockedPackageAction.addAssets.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/assets',
        payload: [{ tokenId: 'ERG', amount: 1 }],
      });

      expect(mockedPackageAction.addAssets).toHaveBeenCalled();
      expect(result.statusCode).toEqual(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error occurred',
        code: 'internal-error',
      });
    });
  });

  describe('POST /packages/:packageId/auths', () => {
    let fastifyInstance: FastifyAPIServer;

    let packageController: PackageController;

    // eslint-disable-next-line
    let adminPreHandlerSpy: any;

    /**
     * Register the /packages/:packageId/auths route for adding auth methods before running the tests in this block.
     */
    beforeAll(async () => {
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockFastifyConfig);
      fastifyInstance = FastifyAPIServer.getInstance();

      packageController = new PackageController({
        packageAction: mockedPackageAction,
        fastifyServer: fastifyInstance,
        networkType: Network.Testnet,
        nodeModel: mockNodeModel,
      });

      // Set up spy before registering the route
      adminPreHandlerSpy = vi.spyOn(fastifyInstance, 'adminPreHandler');

      vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
        (verifyAndEnforce: boolean = true) => {
          return async (request: FastifyRequest) => {
            if (!verifyAndEnforce) return;
            else {
              // Simulate JWT verification and set request.user
              request.user = {
                userId: 12345,
                address: 'mocked-user-address',
                isAdmin: true,
              };
            }
          };
        },
      );

      await fastifyInstance.register(
        packageController.addAuthMethodsToPackageRoute,
        '/packages',
      );

      await fastifyInstance.start();
    });

    afterAll(async () => {
      vi.restoreAllMocks();
      await fastifyInstance.close();
    });

    /**
     * Test for successful POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/1/auths with valid admin user, existing package, valid auth methods
     * @expected
     * - returns 200
     */
    it('should successfully add auth methods to package', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockResolvedValue(mockPackage);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {});
      mockedPackageAction.addPackageAuthMethods.mockResolvedValue([1, 2]);

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/auths',
        payload: [{ id: 1, order: 0 }, { id: 2 }],
      });

      expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
        12345,
      );
      expect(mockedPackageAction.getPackageById).toHaveBeenCalledWith(1);
      expect(mockedPackageAction.validateAuthMethods).toHaveBeenCalledWith([
        1, 2,
      ]);
      expect(mockedPackageAction.addPackageAuthMethods).toHaveBeenCalledWith(
        [{ id: 1, order: 0 }, { id: 2 }],
        mockPackage,
      );
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual({ addedAuthIds: [1, 2] });
    });

    /**
     * Test for schema validation failure in POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/1/auths with invalid body (non-array or invalid fields)
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for invalid body schema', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/auths',
        payload: { invalid: 'body' }, // Not an array
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'Bad Request',
        error: 'body must be array',
      });
    });

    /**
     * Test for invalid auth method id in body schema for POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/1/auths with invalid id (non-number)
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for invalid auth method id in body', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/auths',
        payload: [{ id: 'invalid', order: 0 }],
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'Bad Request',
        error: 'body/0/id must be number',
      });
    });

    /**
     * Test for invalid order in body schema for POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/1/auths with invalid order (negative number)
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for invalid order in body', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/auths',
        payload: [{ id: 1, order: -1 }],
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'Bad Request',
        error: 'body/0/order must be >= 0',
      });
    });

    /**
     * Test for missing packageId param in POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/auths with missing packageId param
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for missing packageId param', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/auths',
        payload: [{ id: 1 }],
      });

      expect(result.statusCode).toEqual(404);

      expect(JSON.parse(result.body)).toEqual({
        error: 'Not Found',
        message: 'Route POST:/packages/auths not found',
        statusCode: 404,
      });
    });

    /**
     * Test for invalid packageId param in POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/invalid/assets with non-number packageId
     * @expected
     * - returns 400 with validation error
     */
    it('should return 400 for invalid packageId param', async () => {
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/invalid/auths',
        payload: [{ id: 1 }],
      });

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'Bad Request',
        error: 'params/packageId must be number',
      });
    });

    /**
     * Test for forbidden (non-admin) in POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/1/assets with non-admin user
     * @expected
     * - returns 403 with Forbidden error
     */
    it('should return 403 for non-admin user', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(false);

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/auths',
        payload: [{ id: 1 }],
      });

      expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
        12345,
      );
      expect(result.statusCode).toEqual(403);
      expect(JSON.parse(result.body)).toEqual({ error: 'Forbidden' });
    });

    /**
     * Test for package not found in POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/999/auths when package does not exist
     * @expected
     * - returns 404 with PACKAGE_NOT_FOUND error
     */
    it('should return 404 for package not found', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockRejectedValue(
        new NotFoundError('Package not found'),
      );

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/999/auths',
        payload: [{ id: 1 }],
      });

      expect(mockedPackageAction.getPackageById).toHaveBeenCalledWith(999);
      expect(result.statusCode).toEqual(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Package not found',
        code: 'PACKAGE_NOT_FOUND',
      });
    });

    /**
     * Test for auth methods not found in POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/1/auths with non-existent auth method IDs
     * @expected
     * - returns 400 with AUTH_NOT_FOUND error
     */
    it('should return 400 for auth methods not found', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockResolvedValue(mockPackage);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {
        throw new NotFoundError('Some auth methods not found for IDs: [999]');
      });

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/auths',
        payload: [{ id: 999 }],
      });

      expect(mockedPackageAction.validateAuthMethods).toHaveBeenCalledWith([
        999,
      ]);
      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Some auth methods not found for IDs: [999]',
        code: 'AUTH_NOT_FOUND',
      });
    });

    /**
     * Test for internal server error in POST /packages/:packageId/auths
     * @target PackageController.addAuthMethodsToPackageRoute
     * @scenario
     * - POST /packages/1/auths when addPackageAuthMethods throws unexpected error
     * @expected
     * - returns 500 with internal server error
     */
    it('should return 500 on internal server error during addPackageAuthMethods', async () => {
      mockedPackageAction.validateAdminRequest.mockResolvedValue(true);
      mockedPackageAction.getPackageById.mockResolvedValue(mockPackage);
      mockedPackageAction.validateAuthMethods.mockImplementation(() => {});
      mockedPackageAction.addPackageAuthMethods.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/packages/1/auths',
        payload: [{ id: 1 }],
      });

      expect(mockedPackageAction.addPackageAuthMethods).toHaveBeenCalled();
      expect(result.statusCode).toEqual(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error occurred',
        code: 'internal-error',
      });
    });
  });
});
