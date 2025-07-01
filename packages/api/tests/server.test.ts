import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { FastifyAPIServer } from '../lib/server';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

// Mock logger
class MockLogger implements AbstractLogger {
  debug = vi.fn();
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
}

describe('FastifyAPIServer', () => {
  let server: FastifyAPIServer;
  const mockLogger = new MockLogger();
  const baseConfig = {
    port: 3000,
    host: 'localhost',
    corsOrigins: '*',
    swagger: {},
    swaggerUi: {},
  };

  beforeEach(async () => {
    // Clear any existing instance
    // eslint-disable-next-line
    (FastifyAPIServer as any).instance = undefined;
    server = await FastifyAPIServer.init(baseConfig, mockLogger);
  });

  afterEach(async () => {
    await server['fastify'].close();
  });

  describe('registerRoutesWithPrefix', () => {
    it('should register routes with the correct prefix', async () => {
      const mockRouteCallback = vi.fn((fastifyInstance: FastifyInstance) => {
        fastifyInstance.get('/test', () => 'test response');
      });

      server.registerRoutesWithPrefix(mockRouteCallback, '/api/v1');

      // Verify the callback was called with the Fastify instance
      expect(mockRouteCallback).toHaveBeenCalledWith(expect.any(Object));

      // Verify the route was registered with the prefix
      const response = await server['fastify'].inject({
        method: 'GET',
        url: '/api/v1/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('test response');
    });

    it('should handle multiple route registrations with different prefixes', async () => {
      const mockCallback1 = vi.fn((fastifyInstance: FastifyInstance) => {
        fastifyInstance.get('/route1', () => 'route1');
      });
      const mockCallback2 = vi.fn((fastifyInstance: FastifyInstance) => {
        fastifyInstance.get('/route2', () => 'route2');
      });

      server.registerRoutesWithPrefix(mockCallback1, '/prefix1');
      server.registerRoutesWithPrefix(mockCallback2, '/prefix2');

      const response1 = await server['fastify'].inject({
        method: 'GET',
        url: '/prefix1/route1',
      });
      const response2 = await server['fastify'].inject({
        method: 'GET',
        url: '/prefix2/route2',
      });

      expect(response1.statusCode).toBe(200);
      expect(response1.body).toBe('route1');
      expect(response2.statusCode).toBe(200);
      expect(response2.body).toBe('route2');
    });

    it('should handle empty prefix correctly', async () => {
      const mockCallback = vi.fn((fastifyInstance: FastifyInstance) => {
        fastifyInstance.get('/root', () => 'root route');
      });

      server.registerRoutesWithPrefix(mockCallback, '');

      const response = await server['fastify'].inject({
        method: 'GET',
        url: '/root',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('root route');
    });

    it('should handle nested prefixes correctly', async () => {
      const mockCallback = vi.fn((fastifyInstance: FastifyInstance) => {
        fastifyInstance.get('/nested', () => 'nested route');
      });

      server.registerRoutesWithPrefix(mockCallback, '/api/v1/users');

      const response = await server['fastify'].inject({
        method: 'GET',
        url: '/api/v1/users/nested',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('nested route');
    });

    it('should pass the correct Fastify instance to the callback', async () => {
      let receivedInstance: FastifyInstance | null = null;
      const mockCallback = vi.fn((fastifyInstance: FastifyInstance) => {
        receivedInstance = fastifyInstance;
        fastifyInstance.get('/test', () => 'test');
      });

      server.registerRoutesWithPrefix(mockCallback, '/test');

      expect(receivedInstance).not.toBeNull();
      expect(receivedInstance).toBe(server['fastify']);
    });

    it('should handle route registration errors in the callback', async () => {
      const error = new Error('Route registration failed');
      const mockCallback = vi.fn(() => {
        throw error;
      });

      expect(() => {
        server.registerRoutesWithPrefix(mockCallback, '/error');
      }).not.toThrow(); // Fastify handles plugin errors asynchronously

      // Verify the error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(error.message);
    });

    it('should work with all HTTP methods', async () => {
      const mockCallback = vi.fn((fastifyInstance: FastifyInstance) => {
        fastifyInstance.get('/get', () => 'GET');
        fastifyInstance.post('/post', () => 'POST');
        fastifyInstance.put('/put', () => 'PUT');
        fastifyInstance.delete('/delete', () => 'DELETE');
      });

      server.registerRoutesWithPrefix(mockCallback, '/methods');

      const getResponse = await server['fastify'].inject({
        method: 'GET',
        url: '/methods/get',
      });
      const postResponse = await server['fastify'].inject({
        method: 'POST',
        url: '/methods/post',
      });
      const putResponse = await server['fastify'].inject({
        method: 'PUT',
        url: '/methods/put',
      });
      const deleteResponse = await server['fastify'].inject({
        method: 'DELETE',
        url: '/methods/delete',
      });

      expect(getResponse.body).toBe('GET');
      expect(postResponse.body).toBe('POST');
      expect(putResponse.body).toBe('PUT');
      expect(deleteResponse.body).toBe('DELETE');
    });
  });

  // Additional tests for singleton behavior
  describe('singleton behavior', () => {
    it('should throw error when getting instance before initialization', () => {
      // @ts-expect-error - We're intentionally clearing the singleton for testing
      FastifyAPIServer.instance = undefined;
      expect(() => FastifyAPIServer.getInstance()).toThrow(
        'FastifyAPIServer instance has not been initialized.',
      );
    });

    it('should throw error when initializing multiple times', async () => {
      await expect(
        FastifyAPIServer.init(baseConfig, mockLogger),
      ).rejects.toThrow('FastifyAPIServer instance has already been initialized.');
    });
  });
});