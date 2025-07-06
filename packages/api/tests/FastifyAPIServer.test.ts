import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyAPIServer } from '../lib/FastifyAPIServer';
import { ServerConfig } from '../lib/types';
import { FastifySeverInstance } from '../lib/types';

/**
 * Test suite for the FastifyAPIServer class.
 * This suite tests the initialization, route registration, and server start functionality.
 */
describe('FastifyAPIServer', () => {
  /**
   * Reset the FastifyAPIServer instance before each test.
   */
  beforeEach(() => {
    // eslint-disable-next-line
    (FastifyAPIServer as any).instance = undefined;
  });

  /**
   * Configuration for the FastifyAPIServer.
   * @type {ServerConfig}
   */
  const config: ServerConfig = {
    port: 3000,
    host: 'localhost',
    corsOrigins: '*',
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
   * Test case to initialized the server properly.
   */
  it('should initialize the server instance', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();
    expect(instance).toBeInstanceOf(FastifyAPIServer);
  });

  /**
   * Test case to verify that an error is thrown if the instance is not initialized.
   */
  it('should throw an error if instance is not initialized', () => {
    expect(() => FastifyAPIServer.getInstance()).toThrow(
      'FastifyAPIServer instance has not been initialized.',
    );
  });

  /**
   * Test case to verify that an error is thrown if trying to initialize the server twice.
   */
  it('should throw an error if trying to initialize twice', async () => {
    await FastifyAPIServer.initialize(config);
    await expect(FastifyAPIServer.initialize(config)).rejects.toThrow(
      'FastifyAPIServer instance has already been initialized.',
    );
  });

  /**
   * Test case to verify that routes are registered with a prefix and respond to requests.
   */
  it('should register routes with a prefix and respond to requests', async () => {
    try {
      await FastifyAPIServer.initialize(config);
      const instance = FastifyAPIServer.getInstance();

      const routeCallback = vi.fn(async (fastify: FastifySeverInstance) => {
        fastify.get('/', async () => 'Hello World');
      });

      // Register the route
      await instance.register(routeCallback, '/test');
      expect(routeCallback).toHaveBeenCalled();

      // Start the server
      await instance.start();

      // Assertions
      const response = await fetch(
        `http://${config.host}:${config.port}/test/`,
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Hello World');

      // free the host and port
      await instance.close();
    } catch (err) {
      console.error('Error during test execution:', err);
      throw err;
    }
  });

  /**
   * Test case to verify that the server starts with no errors.
   */
  it('should start the server with no errors', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();
    await expect(instance.start()).resolves.not.toThrow();
    // free the host and port
    await instance.close();
  });

  /**
   * Test case to verify that an error is thrown when starting the server on a wrong port number.
   */
  it('should throw an error when starting the server on wrong port number', async () => {
    const errorConfig = { ...config, port: -1 };
    await FastifyAPIServer.initialize(errorConfig);
    const instance = FastifyAPIServer.getInstance();

    await expect(instance.start()).rejects.toThrow(RangeError);
  });
});
