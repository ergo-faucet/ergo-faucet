import fastify, { FastifyInstance } from 'fastify';
import fastifySwagger, { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import fastifySwaggerUi, { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { Route, RouteRegistrationCallback, ServerConfig } from './types';

/**
 * Fastify-based API server implementation.
 * Provides a configurable HTTP server with support for CORS, Swagger documentation,
 * and custom route registration.
 * Implements the Singleton pattern to ensure only one server instance exists.
 */
export class FastifyAPIServer {
  private static instance: FastifyAPIServer;
  private fastify: FastifyInstance;
  private routeCallbacks: RouteRegistrationCallback[] = [];
  private port: number;
  private host: string;
  private corsOrigins: string | string[];
  private swagger: FastifyDynamicSwaggerOptions;
  private swaggerUi: FastifySwaggerUiOptions;
  private logger: AbstractLogger;

  /**
   * Private constructor to enforce singleton pattern.
   * @param config - Server configuration parameters including port, host,
   */
  private constructor(config: ServerConfig, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.port = config.port;
    this.host = config.host;
    this.corsOrigins = config.corsOrigins;
    this.swagger = config.swagger;
    this.swaggerUi = config.swaggerUi;

    this.fastify = fastify({
      logger: true,
    });
  }

  /**
   * Gets the singleton instance of FastifyAPIServer.
   * @returns The singleton instance of FastifyAPIServer
   * @throws {Error} If the instance has not been initialized
   */
  public static getInstance(): FastifyAPIServer {
    if (!this.instance) {
      throw new Error('FastifyAPIServer instance has not been initialized.');
    }
    return this.instance;
  }

  /**
   * Initializes the singleton instance with the provided configuration.
   * @param config - Server configuration parameters
   * @param logger - The logger of the class
   * @returns The initialized FastifyAPIServer instance
   */
  public static async init(
    config: ServerConfig,
    logger: AbstractLogger,
  ): Promise<FastifyAPIServer> {
    if (this.instance) {
      throw new Error(
        'FastifyAPIServer instance has already been initialized.',
      );
    }
    this.instance = new FastifyAPIServer(config, logger);
    // Register CORS
    await this.instance.fastify.register(fastifyCors, {
      origin: this.instance.corsOrigins,
    });

    // Register Swagger if configured
    if (this.instance.swagger) {
      await this.instance.fastify.register(
        fastifySwagger,
        this.instance.swagger,
      );
      if (this.instance.swaggerUi) {
        await this.instance.fastify.register(
          fastifySwaggerUi,
          this.instance.swaggerUi,
        );
      }
    }

    // Register all route callbacks
    for (const callback of this.instance.routeCallbacks) {
      await callback(this.instance.fastify);
    }
    return this.instance;
  }

  /**
   * Registers a route callback to be executed during server initialization.
   * @param callback - Function that registers routes with the Fastify instance
   * @example
   * server.registerRoutes(async (fastify) => {
   *   fastify.get('/health', () => ({ status: 'ok' }));
   * });
   */
  registerRoutes(callback: RouteRegistrationCallback) {
    this.routeCallbacks.push(callback);
  }

  /**
   * Registers multiple routes with a common prefix in Fastify.
   *
   * This function takes an array of route definitions and a prefix string. It
   * registers each route in the provided Fastify instance under the specified
   * prefix, allowing you to organize and group related routes together.
   *
   * @param {Route[]} routes - An array of route objects, where each object contains:
   *   - `url`: The URL path for the route (e.g., '/users').
   *   - `method`: The HTTP method for the route (e.g., 'get', 'post').
   *   - `handler`: A function that handles the request and response.
   *
   * @param {string} prefix - The prefix to prepend to each route's URL path.
   *
   * @returns {void}
   *
   * @example
   * // Define some routes
   * const routes = [
   *   { url: '/login', method: 'post', handler: loginHandler },
   *   { url: '/logout', method: 'delete', handler: logoutHandler }
   * ];
   *
   * // Register the routes with a prefix
   * registerRoutesWithPrefix(routes, '/api/auth');
   */
  registerRoutesWithPrefix(routes: Route[], prefix: string): void {
    this.fastify.register(
      (subInstance) => {
        routes.forEach((route) => {
          const fullUrl = `${prefix}${route.url}`;

          // Access the method dynamically and call it with the handler
          switch (route.method) {
            case 'get':
              subInstance.get(fullUrl, route.handler);
              break;
            case 'post':
              subInstance.post(fullUrl, route.handler);
              break;
            case 'put':
              subInstance.put(fullUrl, route.handler);
              break;
            case 'delete':
              subInstance.delete(fullUrl, route.handler);
              break;
            case 'patch':
              subInstance.patch(fullUrl, route.handler);
              break;
            default:
              throw new Error(`Unsupported HTTP method: ${route.method}`);
          }
        });
      },
      { prefix },
    );
  }

  /**
   * Starts the server and begins listening for requests.
   * Initializes the server if not already initialized.
   * @returns Promise that resolves when the server is listening
   * @throws {Error} If server fails to start
   * @example
   * await server.start();
   */
  async start() {
    try {
      await this.fastify.listen({
        port: this.port,
        host: this.host,
      });
      this.logger.info(`Server listening on ${this.host}:${this.port}`);
      if (this.swagger) {
        this.logger.info(
          `Swagger docs available at ${this.host}:${this.port}/docs`,
        );
      }
    } catch (err) {
      this.logger.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }
}
