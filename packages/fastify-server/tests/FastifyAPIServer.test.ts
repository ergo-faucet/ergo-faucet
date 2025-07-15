import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerConfig, FastifyAPIServer, FastifySeverInstance } from '../lib';

/**
 * Test suite for the FastifyAPIServer class.
 * This suite tests the initialization, route registration, JWT handling, and server start functionality.
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
    jwtSecret: 'test_secret',
    jwtExpiration: '1h',
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
    cookie: {
      name: 'auth_token',
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    },
  };
  /**
   * Test case to initialize the server properly.
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

    // A request to the server
    const response = await instance['fastify'].inject({
      method: 'GET',
      url: `/test`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Hello World');

    // free the host and port
    await instance.close();
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

  /**
   * Test to verify that the auth cookie is set correctly.
   * This test checks that the cookie is set with the correct name, options, and value.
   */
  it('should set auth cookie correctly', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    await instance.register(async (fastify) => {
      fastify.get('/set-cookie', async (req, reply) => {
        const token = instance.signJWT({ userId: 123 });
        instance.setAuthCookie(reply, token);
        return { ok: true };
      });
    }, '/cookie');

    const response = await instance['fastify'].inject({
      method: 'GET',
      url: '/cookie/set-cookie',
    });

    expect(response.statusCode).toBe(200);
    const setCookie = response.cookies[0];
    expect(setCookie.name).toBe('auth_token');
    expect(setCookie.value).toBeDefined();
    expect(setCookie.httpOnly).toBe(true);

    await instance.close();
  });
});
