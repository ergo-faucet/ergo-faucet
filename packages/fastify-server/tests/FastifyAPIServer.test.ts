import {
  GoogleRecaptcha,
  TimeoutOrDuplicate,
  InvalidHostname,
  RecaptchaServerError,
  MissingInputSecret,
  InvalidInputSecret,
} from '@ergo-faucet/google-recaptcha';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerConfig, FastifyAPIServer, FastifySeverInstance } from '../lib';

vi.mock('@ergo-faucet/google-recaptcha', () => {
  class MockInvalidHostname extends Error {
    name = 'InvalidHostname';
  }
  class MockRecaptchaServerError extends Error {
    name = 'RecaptchaServerError';
  }
  class MockTimeoutOrDuplicate extends Error {
    name = 'TimeoutOrDuplicate';
  }

  return {
    GoogleRecaptcha: vi.fn().mockImplementation(() => ({
      verifyToken: vi.fn(async (token: string) => {
        if (token === 'valid_token') return true;
        if (token === 'timeout_token') throw new MockTimeoutOrDuplicate();
        if (token === 'hostname_token') throw new MockInvalidHostname();
        if (token === 'error_token')
          throw new MockRecaptchaServerError('Test error');
        return false;
      }),
      logger: console,
      recaptchaKey: 'fake-key',
      threshold: 0.5,
      hostnames: ['localhost'],
    })),
    InvalidHostname: MockInvalidHostname,
    RecaptchaServerError: MockRecaptchaServerError,
    TimeoutOrDuplicate: MockTimeoutOrDuplicate,
    MissingInputSecret: class MissingInputSecret extends Error {
      name = 'MissingInputSecret';
    },
    InvalidInputSecret: class InvalidInputSecret extends Error {
      name = 'InvalidInputSecret';
    },
    RecaptchaClientError: class RecaptchaClientError extends Error {},
    MissingToken: class MissingToken extends Error {
      name = 'MissingToken';
    },
    InvalidToken: class InvalidToken extends Error {
      name = 'InvalidToken';
    },
    BadRequest: class BadRequest extends Error {
      name = 'BadRequest';
    },
  };
});

/**
 * Test suite for the FastifyAPIServer class.
 * This suite tests the initialization, route registration, JWT handling, and server start functionality.
 */
describe('FastifyAPIServer', () => {
  let mockGoogleRecaptcha: GoogleRecaptcha & {
    verifyToken: ReturnType<typeof vi.fn>;
  };
  let config: ServerConfig;
  let serverInstance: FastifyAPIServer;

  /**
   * Reset the FastifyAPIServer instance before each test.
   */
  beforeEach(() => {
    // eslint-disable-next-line
    (FastifyAPIServer as any).instance = undefined;
    mockGoogleRecaptcha = {
      verifyToken: vi.fn(async (token: string) => {
        if (token === 'valid_token') return true;
        if (token === 'timeout_token') throw new TimeoutOrDuplicate();
        if (token === 'hostname_token') throw new InvalidHostname();
        if (token === 'error_token')
          throw new RecaptchaServerError('Test error');
        return false;
      }),
      logger: console,
      recaptchaKey: 'fake-key',
      threshold: 0.5,
      hostnames: ['localhost'],
      // eslint-disable-next-line
    } as any;

    /**
     * Configuration for the FastifyAPIServer.
     * @type {ServerConfig}
     */
    config = {
      port: 3000,
      host: 'localhost',
      corsOrigins: '*',
      jwtSecret: 'test_secret',
      jwtExpiration: 300,
      googleRecaptcha: mockGoogleRecaptcha,
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
        domain: 'localhost',
        signed: false,
      },
    };
  });

  afterEach(async () => {
    if (serverInstance) {
      await serverInstance.close().catch(() => {});
    }
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
   * Group of test cases for error handling in reCAPTCHA integration.
   */
  describe('reCAPTCHA Integration Error Cases', () => {
    /**
     * Should throw TimeoutOrDuplicate error on duplicate/expired token.
     */
    it('should handle timeout/duplicate tokens', async () => {
      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      await expect(
        serverInstance.verifyCaptcha('timeout_token'),
      ).rejects.toThrow(TimeoutOrDuplicate);
    });

    /**
     * Should throw InvalidHostname error on invalid hostname.
     */
    it('should handle invalid hostname errors', async () => {
      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      await expect(
        serverInstance.verifyCaptcha('hostname_token'),
      ).rejects.toThrow(InvalidHostname);
    });

    /**
     * Should throw RecaptchaServerError on internal server error.
     */
    it('should handle server errors', async () => {
      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      await expect(serverInstance.verifyCaptcha('error_token')).rejects.toThrow(
        RecaptchaServerError,
      );
    });

    /**
     * Should throw MissingInputSecret when secret key is missing.
     */
    it('should handle missing input secret errors', async () => {
      mockGoogleRecaptcha.verifyToken.mockRejectedValueOnce(
        new MissingInputSecret(),
      );
      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      await expect(serverInstance.verifyCaptcha('any_token')).rejects.toThrow(
        MissingInputSecret,
      );
    });

    /**
     * Should throw InvalidInputSecret when secret key is invalid.
     */
    it('should handle invalid input secret errors', async () => {
      mockGoogleRecaptcha.verifyToken.mockRejectedValueOnce(
        new InvalidInputSecret(),
      );
      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      await expect(serverInstance.verifyCaptcha('any_token')).rejects.toThrow(
        InvalidInputSecret,
      );
    });
  });

  /**
   * Group of test cases to validate response handling in captchaPreHandler errors.
   */
  describe('captchaPreHandler Error Routes', () => {
    /**
     * Initialize Fastify server and route before each error test.
     */
    beforeEach(async () => {
      await FastifyAPIServer.initialize(config);
      serverInstance = FastifyAPIServer.getInstance();

      await serverInstance.register(async (fastify) => {
        fastify.post(
          '/protected',
          { preHandler: serverInstance.captchaPreHandler },
          async () => ({ success: true }),
        );
      }, '');

      await serverInstance.start();
    });

    /**
     * Should return 400 for TimeoutOrDuplicate token.
     */
    it('should return 400 for timeout/duplicate errors', async () => {
      const response = await serverInstance['fastify'].inject({
        method: 'POST',
        url: '/protected',
        payload: { captchaToken: 'timeout_token' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        code: 'captcha-timeout-or-duplicate',
        message: 'Captcha token expired or already used',
      });
    });

    /**
     * Should return 400 for InvalidHostname token.
     */
    it('should return 400 for invalid hostname', async () => {
      const response = await serverInstance['fastify'].inject({
        method: 'POST',
        url: '/protected',
        payload: { captchaToken: 'hostname_token' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        code: 'invalid-hostname',
        message: 'Invalid hostname for captcha verification',
      });
    });

    /**
     * Should return 500 for internal server errors.
     */
    it('should return 500 for server errors', async () => {
      const response = await serverInstance['fastify'].inject({
        method: 'POST',
        url: '/protected',
        payload: { captchaToken: 'error_token' },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        code: 'captcha-verification-failed',
        message: 'Internal server error during captcha verification',
      });
    });

    /**
     * Should return 400 when captcha token is missing in the payload.
     */
    it('should return 400 for missing token', async () => {
      const response = await serverInstance['fastify'].inject({
        method: 'POST',
        url: '/protected',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        code: 'missing-captcha-token',
        message: 'Captcha token is required',
      });
    });
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
