import { setupGoogleRecaptchaMock } from './mockData';
setupGoogleRecaptchaMock();
import {
  RecaptchaServerError,
  RecaptchaClientError,
} from '@ergo-faucet/google-recaptcha';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  afterAll,
} from 'vitest';
import { FastifyAPIServer, FastifySeverInstance } from '../lib';
import { config, mockGoogleRecaptcha } from './mockData';

/**
 * Test suite for the FastifyAPIServer class.
 * This suite tests the initialization, route registration, JWT handling, and server start functionality.
 */
describe('FastifyAPIServer', () => {
  let serverInstance: FastifyAPIServer;

  /**
   * Reset the FastifyAPIServer instance before each test.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line
    (FastifyAPIServer as any).instance = undefined;
  });

  afterEach(async () => {
    if (serverInstance) {
      await serverInstance.close().catch(() => {});
    }
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

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
  it('should throw an error when starting on wrong port', async () => {
    const errorConfig = { ...config, port: -1 };
    await FastifyAPIServer.initialize(errorConfig);
    const instance = FastifyAPIServer.getInstance();
    await expect(instance.start()).rejects.toThrow(RangeError);
  });

  /**
   * Test case to verify that the authentication cookie is set correctly.
   */
  it('should set auth cookie correctly', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    await instance.register(async (fastify) => {
      fastify.get('/set-cookie', async (req, reply) => {
        const token = await reply.jwtSign({ userId: 123 });
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

  /**
   * Test case to verify the captchaPreHandler middleware.
   */
  it('should set auth cookie with correct options', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    await instance.register(async (fastify) => {
      fastify.get('/set-auth-cookie', async (req, reply) => {
        const token = await reply.jwtSign({ userId: 42 });
        instance.setAuthCookie(reply, token);
        return { ok: true };
      });
    }, '');

    const response = await instance['fastify'].inject({
      method: 'GET',
      url: '/set-auth-cookie',
    });

    const cookieHeader = response.headers['set-cookie'];
    expect(cookieHeader).toContain('auth_token=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('Path=/');
    expect(cookieHeader).toContain('Max-Age=3600');
  });

  /**
   * Test case to verify the captcha verification method directly.
   */
  it('should verify captcha directly', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    const isValid = await instance.verifyCaptcha('valid_token');
    expect(isValid).toBe(true);

    const isInvalid = await instance.verifyCaptcha('some_bad_token');
    expect(isInvalid).toBe(false);

    expect(mockGoogleRecaptcha.verifyToken).toHaveBeenCalledTimes(2);
  });

  /**
   * Test case to verify the captchaPreHandler middleware.
   */

  it('should handle RecaptchaClientError in captchaPreHandler', async () => {
    // simulate client error
    mockGoogleRecaptcha.verifyToken.mockRejectedValueOnce(
      new RecaptchaClientError('Client-side issue'),
    );

    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    await instance.register(async (fastify) => {
      fastify.post(
        '/captcha-client-error',
        { preHandler: instance.captchaPreHandler },
        async () => ({ success: true }),
      );
    }, '');

    await instance.start();

    const response = await instance['fastify'].inject({
      method: 'POST',
      url: '/captcha-client-error',
      payload: { captchaToken: 'error_token' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      code: 'captcha-verification-failed',
      message: 'Client-side issue',
    });

    await instance.close();
  });

  /**
   * Test case to verify the captchaPreHandler middleware protects a route correctly.
   */
  it('should protect a route using captchaPreHandler', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    await instance.register(async (fastify) => {
      fastify.post(
        '/captcha-protected',
        { preHandler: instance.captchaPreHandler },
        async () => ({ success: true }),
      );
    }, '');

    await instance.start();

    const resMissing = await instance['fastify'].inject({
      method: 'POST',
      url: '/captcha-protected',
      payload: {},
    });
    expect(resMissing.statusCode).toBe(400);
    expect(JSON.parse(resMissing.body)).toEqual({
      code: 'missing-captcha-token',
      message: 'Captcha token is required',
    });

    const resInvalid = await instance['fastify'].inject({
      method: 'POST',
      url: '/captcha-protected',
      payload: { captchaToken: 'invalid_token' },
    });
    expect(resInvalid.statusCode).toBe(400);
    expect(JSON.parse(resInvalid.body)).toEqual({
      code: 'invalid-captcha-token',
      message: 'Invalid captcha token',
    });

    const resValid = await instance['fastify'].inject({
      method: 'POST',
      url: '/captcha-protected',
      payload: { captchaToken: 'valid_token' },
    });
    expect(resValid.statusCode).toBe(200);
    expect(JSON.parse(resValid.body)).toEqual({ success: true });

    await instance.close();
  });

  /**
   * Test case to verify the captchaPreHandler handles RecaptchaServerError correctly.
   */
  it('should handle RecaptchaServerError in captchaPreHandler', async () => {
    // simulate server error
    mockGoogleRecaptcha.verifyToken.mockRejectedValueOnce(
      new RecaptchaServerError('Internal error'),
    );

    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();

    await instance.register(async (fastify) => {
      fastify.post(
        '/captcha-error',
        { preHandler: instance.captchaPreHandler },
        async () => ({ success: true }),
      );
    }, '');

    await instance.start();

    const response = await instance['fastify'].inject({
      method: 'POST',
      url: '/captcha-error',
      payload: { captchaToken: 'server_error' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      code: 'captcha-verification-failed',
      message: 'Internal server error during captcha verification',
    });

    await instance.close();
  });

  /**
   * Group of tests to verify reCAPTCHA score threshold behavior.
   */
  describe('reCAPTCHA Score Threshold', () => {
    /**
     * Should reject tokens that are below the acceptable score threshold.
     */
    it('should reject tokens below score threshold', async () => {
      mockGoogleRecaptcha.verifyToken.mockResolvedValueOnce(false);

      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      const isValid = await serverInstance.verifyCaptcha('low_score_token');
      expect(isValid).toBe(false);
    });

    /**
     * Should accept tokens that are above the acceptable score threshold.
     */
    it('should accept tokens above score threshold', async () => {
      mockGoogleRecaptcha.verifyToken.mockResolvedValueOnce(true);

      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      const isValid = await serverInstance.verifyCaptcha('high_score_token');
      expect(isValid).toBe(true);
    });
  });
});
