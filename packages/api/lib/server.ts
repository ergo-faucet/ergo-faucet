import fastify, { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifyCors from '@fastify/cors';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ServerConfig, RouteRegistrationCallback, APIServer } from './types';


/**
 * Fastify-based API server implementation.
 * Provides a configurable HTTP server with support for CORS, Swagger documentation,
 * and custom route registration.
 */
export class FastifyAPIServer implements APIServer {
  private fastify: FastifyInstance;
  private routeCallbacks: RouteRegistrationCallback[] = [];
  private config: ServerConfig;
  private logger: AbstractLogger;

  /**
   * Creates a new FastifyAPIServer instance.
   * @param config - Server configuration parameters including port, host, and logger
   * @example
   * const server = new FastifyAPIServer({
   *   port: 3000,
   *   host: 'localhost',
   *   logger: new CustomLogger()
   * });
   */
  constructor(config: ServerConfig) {
    this.logger = config.logger ?? new DummyLogger();
    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? '0.0.0.0',
      logger: this.logger,
      corsOrigins: config.corsOrigins ?? '*',
      swagger: config.swagger,
    }; 

    this.fastify = fastify({
      logger: true,
    });
  }

  /**
   * Initializes the server by registering plugins and routes.
   * Sets up CORS, Swagger documentation (if configured), and registers all route callbacks.
   * @returns Promise that resolves when initialization is complete
   * @example
   * await server.init();
   */
  async init() {
    // Register CORS
    await this.fastify.register(fastifyCors, {
      origin: this.config.corsOrigins,
    });

    // Register Swagger if configured
    if (this.config.swagger) {
      await this.fastify.register(fastifySwagger, this.config.swagger);
    }

    // Register all route callbacks
    for (const callback of this.routeCallbacks) {
      await callback(this.fastify, this.config);
    }
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
   * Starts the server and begins listening for requests.
   * Initializes the server if not already initialized.
   * @returns Promise that resolves when the server is listening
   * @throws {Error} If server fails to start
   * @example
   * await server.start();
   */
  async start() {
    await this.init();
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });
      this.logger.info(
        `Server listening on ${this.config.host}:${this.config.port}`
      );
      if (this.config.swagger) {
        this.logger.info(
          `Swagger docs available at ${this.config.host}:${this.config.port}/docs`
        );
      }
    } catch (err) {
      this.logger.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }
}