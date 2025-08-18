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
} from './mockUtils';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

import { RequestLimitError, NotFoundError } from '@ergo-faucet/database';
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
        // eslint-disable-next-line
        {} as any as FastifyAPIServer,
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
      expect(result.body).toEqual('');
    });

    /**
     * Test for missing userId in POST /packages/request
     * @target PackageController.requestPackageRoute
     * @scenario
     * - POST /packages/request without userId
     * @expected
     * - returns 400 with missing userId error
     */
    it('should return 400 for missing userId', async () => {
      mockedFastifyServer.authPreHandler.mockImplementationOnce(
        async (request) => {
          request.user = {
            // Simulate missing userId
            address: 'mocked-user-address',
          };
        },
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

      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Missing userId',
        code: 'Bad Request',
      });
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
    describe('adminPreHandler', async () => {
      let fastifyInstance: FastifyAPIServer;
      beforeEach(async () => {
        // Reset the singleton
        // eslint-disable-next-line
        (FastifyAPIServer as any).instance = undefined;

        await FastifyAPIServer.initialize(mockConfig);
        fastifyInstance = FastifyAPIServer.getInstance();

        vi.clearAllMocks();
      });

      const packageController = new PackageController(
        mockedPackageAction,
        mockedFastifyServer,
      );

      it('should allow admin user', async () => {
        mockedPackageAction.validateAdminRequest.mockResolvedValue(true);

        vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
          async (request) => {
            request.user = {
              userId: 12345,
              address: 'mocked-user-address',
              isAdmin: true, // Simulate admin user
            };
          },
        );
        await fastifyInstance.register(async (fastify) => {
          fastify.post(
            '/allow-admin',
            {
              preHandler: [
                fastifyInstance.authPreHandler,
                packageController.adminPreHandler,
              ],
            },
            async () => ({ success: true }),
          );
        }, '');

        await fastifyInstance.start();

        const response = await fastifyInstance['fastify'].inject({
          method: 'POST',
          url: '/allow-admin',
          payload: {},
        });

        expect(fastifyInstance.authPreHandler).toHaveBeenCalled();
        expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
          12345,
        );
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ success: true });

        await fastifyInstance.close();
      });

      it('should deny non-admin user and return 403 forbidden when isAdmin is undefined ', async () => {
        vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
          async (request) => {
            request.user = {
              userId: 12345,
              address: 'mocked-user-address',
              isAdmin: undefined,
            };
          },
        );

        await fastifyInstance.register(async (fastify) => {
          fastify.post(
            '/deny-user',
            {
              preHandler: [
                fastifyInstance.authPreHandler,
                packageController.adminPreHandler,
              ],
            },
            async () => ({ success: true }),
          );
        }, '');
        await fastifyInstance.start();

        const response = await fastifyInstance['fastify'].inject({
          method: 'POST',
          url: '/deny-user',
          payload: {},
        });

        expect(fastifyInstance.authPreHandler).toHaveBeenCalled();
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body)).toEqual({ error: 'Forbidden' });

        await fastifyInstance.close();
      });

      it('should deny non-admin user and return 403 forbidden when isAdmin is false ', async () => {
        vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
          async (request) => {
            request.user = {
              userId: 12345,
              address: 'mocked-user-address',
              isAdmin: false,
            };
          },
        );

        await fastifyInstance.register(async (fastify) => {
          fastify.post(
            '/deny-user',
            {
              preHandler: [
                fastifyInstance.authPreHandler,
                packageController.adminPreHandler,
              ],
            },
            async () => ({ success: true }),
          );
        }, '');

        await fastifyInstance.start();

        const response = await fastifyInstance['fastify'].inject({
          method: 'POST',
          url: '/deny-user',
          payload: {},
        });

        expect(fastifyInstance.authPreHandler).toHaveBeenCalled();
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body)).toEqual({ error: 'Forbidden' });

        await fastifyInstance.close();
      });

      it('should deny non-admin user and return 403 forbidden when isAdmin in DB or userId does not exits ', async () => {
        const authPreHandlerMock = vi.fn();

        authPreHandlerMock.mockImplementation(async (request) => {
          request.user = {
            userId: 12345,
            address: 'mocked-user-address',
            isAdmin: true,
          };
        });
        vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
          authPreHandlerMock,
        );

        await fastifyInstance.register(async (fastify) => {
          fastify.post(
            '/deny-user',
            {
              preHandler: [
                fastifyInstance.authPreHandler,
                packageController.adminPreHandler,
              ],
            },
            async () => ({ success: true }),
          );
        }, '');

        mockedPackageAction.validateAdminRequest.mockResolvedValue(false);

        await fastifyInstance.start();

        const response = await fastifyInstance['fastify'].inject({
          method: 'POST',
          url: '/deny-user',
          payload: {},
        });

        expect(mockedPackageAction.validateAdminRequest).toHaveBeenCalledWith(
          12345,
        );
        expect(fastifyInstance.authPreHandler).toHaveBeenCalled();
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body)).toEqual({ error: 'Forbidden' });

        await fastifyInstance.close();
      });

      it('should return 500 on internal server error when an error ocured', async () => {
        const authPreHandlerMock = vi.fn();

        authPreHandlerMock.mockImplementation(async (request) => {
          request.user = {
            userId: 12345,
            address: 'mocked-user-address',
            isAdmin: true,
          };
        });
        vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
          authPreHandlerMock,
        );

        await fastifyInstance.register(async (fastify) => {
          fastify.post(
            '/deny-user',
            {
              preHandler: [
                fastifyInstance.authPreHandler,
                packageController.adminPreHandler,
              ],
            },
            async () => ({ success: true }),
          );
        }, '');

        mockedPackageAction.validateAdminRequest.mockRejectedValue(
          new Error('Database error'),
        );

        await fastifyInstance.start();

        const response = await fastifyInstance['fastify'].inject({
          method: 'POST',
          url: '/deny-user',
          payload: {},
        });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toEqual({
          error: 'Internal server error during admin validation',
          code: 'admin-validation-error',
        });

        await fastifyInstance.close();
      });
    });
  });
});
