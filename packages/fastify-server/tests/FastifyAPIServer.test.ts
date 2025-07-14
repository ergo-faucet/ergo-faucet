import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerConfig, FastifyAPIServer, FastifySeverInstance } from '../lib';

/**
 * Test suite for the FastifyAPIServer class.
 * This suite tests the initialization, route registration, JWT handling, and server start functionality.
 */
describe('FastifyAPIServer', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    // eslint-disable-next-line
    (FastifyAPIServer as any).instance = undefined;
  });

  const config: ServerConfig = {
    port: 3000,
    host: 'localhost',
    corsOrigins: '*',
    jwtSecret: 'test_secret',
    swagger: {
      exposeHeadRoutes: true,
      openapi: {
        info: {
          title: 'Test API',
          description: 'API Documentation',
          version: '1.0.0',
        },
      },
    },
    swaggerUi: {
      routePrefix: '/docs',
    },
    activeFastifyLogger: false,
  };

  /**
   * Test to verify that the server initializes correctly with valid configuration.
   */
  it('should initialize the server instance', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();
    expect(instance).toBeInstanceOf(FastifyAPIServer);
  });

  /**
   * Test to verify that accessing instance before initialization throws an error.
   */
  it('should throw an error if instance is not initialized', () => {
    expect(() => FastifyAPIServer.getInstance()).toThrow(
      'FastifyAPIServer instance has not been initialized.',
    );
  });

  /**
   * Test to verify that reinitializing the singleton instance throws an error.
   */
  it('should throw an error if trying to initialize twice', async () => {
    await FastifyAPIServer.initialize(config);
    await expect(FastifyAPIServer.initialize(config)).rejects.toThrow(
      'FastifyAPIServer instance has already been initialized.',
    );
  });

  /**
   * Test to verify that a route can be registered and responds correctly to requests.
   */
  it('should register routes with a prefix and respond to requests', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    const routeCallback = vi.fn(async (fastify: FastifySeverInstance) => {
      fastify.get('/', async () => 'Hello World');
    });

    await instance.register(routeCallback, '/test');
    expect(routeCallback).toHaveBeenCalled();

    await instance.start();

    const response = await instance['fastify'].inject({
      method: 'GET',
      url: `/test`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Hello World');

    await instance.close();
  });

  /**
   * Test to verify that the server starts successfully without throwing errors.
   */
  it('should start the server with no errors', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();
    await expect(instance.start()).resolves.not.toThrow();
    await instance.close();
  });

  /**
   * Test to verify that starting the server on an invalid port throws an error.
   */
  it('should throw an error when starting the server on wrong port number', async () => {
    const errorConfig = { ...config, port: -1 };
    await FastifyAPIServer.initialize(errorConfig);
    const instance = FastifyAPIServer.getInstance();

    await expect(instance.start()).rejects.toThrow(RangeError);
  });

  /**
   * Test to verify that JWT signing and verification work as expected.
   */
  it('should sign and verify JWT correctly', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    const payload = { user: 'test_user', role: 'admin' };
    const token = instance.signJWT(payload);
    const verified = instance.verifyJWT<typeof payload>(token);

    expect(verified.user).toBe('test_user');
    expect(verified.role).toBe('admin');
  });
});
