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
 * This suite validates initialization, route registration, cookie handling, reCAPTCHA verification,
 * and general server lifecycle (start/stop).
 */
describe('FastifyAPIServer', () => {
  let serverInstance: FastifyAPIServer | undefined;

  /**
   * Reset FastifyAPIServer singleton before each test to ensure a clean state.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line
    (FastifyAPIServer as any).instance = undefined;
  });

  afterEach(async () => {
    if (serverInstance) {
      await serverInstance.close().catch(() => {});
      serverInstance = undefined;
    }
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test for initializing the FastifyAPIServer successfully
   * @target FastifyAPIServer.initialize
   * @scenario
   * - Call initialize with valid config
   * - Retrieve instance via getInstance
   * @expected
   * - getInstance returns an instance of FastifyAPIServer
   */
  it('should initialize the server instance', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();
    expect(instance).toBeInstanceOf(FastifyAPIServer);
  });

  /**
   * Test for accessing FastifyAPIServer before initialization
   * @target FastifyAPIServer.getInstance
   * @scenario
   * - Directly call getInstance without calling initialize
   * @expected
   * - should throw "FastifyAPIServer instance has not been initialized."
   */
  it('should throw an error if instance is not initialized', () => {
    expect(() => FastifyAPIServer.getInstance()).toThrow(
      'FastifyAPIServer instance has not been initialized.',
    );
  });

  /**
   * Test for double initialization of FastifyAPIServer
   * @target FastifyAPIServer.initialize
   * @scenario
   * - Initialize once successfully
   * - Try to initialize again
   * @expected
   * - should reject with "FastifyAPIServer instance has already been initialized."
   */
  it('should throw an error if trying to initialize twice', async () => {
    await FastifyAPIServer.initialize(config);
    await expect(FastifyAPIServer.initialize(config)).rejects.toThrow(
      'FastifyAPIServer instance has already been initialized.',
    );
  });

  /**
   * Test for route registration and HTTP response
   * @target FastifyAPIServer.register
   * @scenario
   * - Initialize server
   * - Register a test route with a prefix
   * - Start server and inject request
   * @expected
   * - route is called
   * - server responds 200 with "Hello World"
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
   * Test for starting the server with correct config
   * @target FastifyAPIServer.start
   * @scenario
   * - Initialize server with valid port
   * - Call start()
   * @expected
   * - should resolve without throwing errors
   */
  it('should start the server with no errors', async () => {
    await FastifyAPIServer.initialize(config);
    const instance = FastifyAPIServer.getInstance();
    await expect(instance.start()).resolves.not.toThrow();
    await instance.close();
  });

  /**
   * Test for starting the server with invalid port
   * @target FastifyAPIServer.start
   * @scenario
   * - Initialize server with invalid port (-1)
   * - Call start()
   * @expected
   * - should throw RangeError
   */
  it('should throw an error when starting on wrong port', async () => {
    const errorConfig = { ...config, port: -1 };
    await FastifyAPIServer.initialize(errorConfig);
    const instance = FastifyAPIServer.getInstance();
    await expect(instance.start()).rejects.toThrow(RangeError);
  });

  /**
   * Test for auth cookie creation
   * @target FastifyAPIServer.setAuthCookie
   * @scenario
   * - Register a route that sets auth cookie after JWT sign
   * - Call the route and inspect cookie
   * @expected
   * - Cookie name is "auth_token"
   * - It’s httpOnly and has a value
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
   * Test for cookie options correctness
   * @target FastifyAPIServer.setAuthCookie
   * @scenario
   * - Register a route and set cookie
   * - Inspect Set-Cookie header
   * @expected
   * - header includes auth_token, HttpOnly, Path=/, Max-Age
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
   * Test for captchaPreHandler catching RecaptchaClientError
   * @target FastifyAPIServer.captchaPreHandler
   * @scenario
   * - mock verifyToken throws RecaptchaClientError
   * - call route protected by captchaPreHandler
   * @expected
   * - responds with 400 and code captcha-verification-failed
   */
  it('should handle RecaptchaClientError in captchaPreHandler', async () => {
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
    expect(JSON.parse(response.body)).deep.equal({
      code: 'captcha-verification-failed',
      error: 'Client-side issue',
    });

    await instance.close();
  });

  /**
   * Test for protecting route with captchaPreHandler
   * @target FastifyAPIServer.captchaPreHandler
   * @scenario
   * - Register POST route with captchaPreHandler
   * - Send empty payload → missing token
   * - Send invalid token → invalid-captcha-token
   * - Send valid token → success
   * @expected
   * - returns 400 with missing-captcha-token
   * - returns 400 with invalid-captcha-token
   * - returns 200 with { success: true }
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
    expect(JSON.parse(resMissing.body)).deep.equal({
      code: 'missing-captcha-token',
      error: 'Captcha token is required',
    });

    const resInvalid = await instance['fastify'].inject({
      method: 'POST',
      url: '/captcha-protected',
      payload: { captchaToken: 'invalid_token' },
    });
    expect(resInvalid.statusCode).toBe(400);
    expect(JSON.parse(resInvalid.body)).toEqual({
      code: 'invalid-captcha-token',
      error: 'Invalid captcha token',
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
   * Test for captchaPreHandler catching RecaptchaServerError
   * @target FastifyAPIServer.captchaPreHandler
   * @scenario
   * - mock verifyToken throws RecaptchaServerError
   * - call route protected by captchaPreHandler
   * @expected
   * - responds with 500 and internal server error message
   */
  it('should handle RecaptchaServerError in captchaPreHandler', async () => {
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

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).deep.equal({
      code: 'captcha-verification-failed',
      error: 'Internal server error during captcha verification',
    });

    await instance.close();
  });
});
