import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyAPIServer } from '../lib/server';
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { ServerConfig } from '../lib/types';

/**
 * Test suite for FastifyAPIServer class.
 * Verifies server initialization, route registration, and server start functionality.
 */
describe('FastifyAPIServer', () => {
  let server: FastifyAPIServer;
  const mockLogger = new DummyLogger();
  const defaultConfig = {
    port: 3000,
    host: '0.0.0.0',
    logger: mockLogger,
    corsOrigins: '*',
  };

  beforeEach(() => {
    // Reset the singleton instance before each test
    (FastifyAPIServer as any).instance = undefined;
    server = FastifyAPIServer.init(defaultConfig);
  });

  afterEach(async () => {
    await server['fastify'].close();
  });

  /**
   * Tests for singleton pattern implementation.
   * Verifies proper initialization and instance management.
   */
  describe('singleton pattern', () => {
    /**
     * Verifies that getInstance throws an error when instance is not initialized.
     */
    it('should throw error when getting instance before initialization', () => {
      (FastifyAPIServer as any).instance = undefined;
      expect(() => FastifyAPIServer.getInstance()).toThrow('FastifyAPIServer instance has not been initialized');
    });

    /**
     * Verifies that init creates a new instance and getInstance returns it.
     */
    it('should create instance and allow retrieval', () => {
      const instance = FastifyAPIServer.getInstance();
      expect(instance).toBe(server);
    });

    /**
     * Verifies that init throws an error when instance already exists.
     */
    it('should throw error when initializing multiple times', () => {
      expect(() => FastifyAPIServer.init(defaultConfig)).toThrow('FastifyAPIServer instance has already been initialized');
    });
  });

  /**
   * Tests for server initialization.
   * Verifies CORS and Swagger plugin registration.
   */
  describe('init', () => {
    /**
     * Verifies that the server initializes with CORS support enabled.
     */
    it('should initialize server with CORS', async () => {
      await server.init();
      const response = await server['fastify'].inject({
        method: 'OPTIONS',
        url: '/',
        headers: {
          'Origin': 'http://test.com',
          'Access-Control-Request-Method': 'GET'
        }
      });
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    /**
     * Verifies that the server initializes with Swagger documentation
     * when Swagger configuration is provided.
     */
    it('should initialize server with Swagger when configured', async () => {
      const uiConfigOptions: { docExpansion?: "full" | "list" | "none" | undefined; deepLinking: boolean } = {
        docExpansion: "full",
        deepLinking: false,
      };
      const swaggerConfig: ServerConfig = {
        ...defaultConfig,
        swagger: {
          swagger: {
            info: {
              title: 'Test API',
              version: '1.0.0',
            },
          },
        },
        swaggerUi: {
          routePrefix: '/docs',
          uiConfig: uiConfigOptions,
        },
      };
      (FastifyAPIServer as any).instance = undefined;
      const swaggerServer = FastifyAPIServer.init(swaggerConfig);
      await swaggerServer.init();
      const response = await swaggerServer['fastify'].inject({
        method: 'GET',
        url: '/docs/json'
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toMatchObject({
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        }
      });
    });
  });

  /**
   * Tests for route registration.
   * Verifies single and multiple route callback registration.
   */
  describe('registerRoutes', () => {
    /**
     * Verifies that a single route callback can be registered and executed
     * during server initialization.
     */
    it('should register route callbacks', async () => {
      server.registerRoutes(async (fastify) => {
        fastify.get('/test', () => ({ status: 'ok' }));
      });
      await server.init();
      const response = await server['fastify'].inject({
        method: 'GET',
        url: '/test'
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
    });

    /**
     * Verifies that multiple route callbacks can be registered and executed
     * in the correct order during server initialization.
     */
    it('should register multiple route callbacks in order', async () => {
      const responses: string[] = [];
      server.registerRoutes(async (fastify) => {
        fastify.get('/first', () => {
          responses.push('first');
          return { order: 1 };
        });
      });
      server.registerRoutes(async (fastify) => {
        fastify.get('/second', () => {
          responses.push('second');
          return { order: 2 };
        });
      });
      await server.init();
      
      await server['fastify'].inject({
        method: 'GET',
        url: '/first'
      });
      await server['fastify'].inject({
        method: 'GET',
        url: '/second'
      });
      
      expect(responses).toEqual(['first', 'second']);
    });
  });

  /**
   * Tests for server start functionality.
   * Verifies successful server start, Swagger docs logging, and error handling.
   */
  describe('start', () => {
    /**
     * Verifies that the server starts successfully and logs the listening address.
     */
    it('should start server successfully', async () => {
      const spy = vi.spyOn(mockLogger, 'info');
      await server.start();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Server listening on'));
      
      // Verify server is actually running
      const response = await server['fastify'].inject({
        method: 'GET',
        url: '/'
      });
      expect(response.statusCode).toBe(404); // Default 404 for undefined routes
    });

    /**
     * Verifies that the server logs the Swagger documentation URL
     * when Swagger is configured.
     */
    it('should log Swagger docs URL when configured', async () => {
      const uiConfigOptions: { docExpansion?: "full" | "list" | "none" | undefined; deepLinking: boolean } = {
        docExpansion: "full",
        deepLinking: false,
      };
      const swaggerConfig: ServerConfig = {
        ...defaultConfig,
        swagger: {
          swagger: {
            info: {
              title: 'Test API',
              version: '1.0.0',
            },
          },
        },
        swaggerUi: {
          routePrefix: '/docs',
          uiConfig: uiConfigOptions,
        },
      };
      (FastifyAPIServer as any).instance = undefined;
      const swaggerServer = FastifyAPIServer.init(swaggerConfig);
      const spy = vi.spyOn(mockLogger, 'info');
      await swaggerServer.start();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Swagger docs available at'));
      
      // Verify Swagger UI is accessible
      const response = await swaggerServer['fastify'].inject({
        method: 'GET',
        url: '/docs'
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    /**
     * Verifies that the server handles startup errors correctly,
     * logging the error and exiting with status code 1.
     */
    it('should handle server start errors', async () => {
      const errorConfig = {
        ...defaultConfig,
        port: -1,
      };
      (FastifyAPIServer as any).instance = undefined;
      const errorServer = FastifyAPIServer.init(errorConfig);
      const spy = vi.spyOn(mockLogger, 'error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      await errorServer.start();
      
      expect(spy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });
}); 