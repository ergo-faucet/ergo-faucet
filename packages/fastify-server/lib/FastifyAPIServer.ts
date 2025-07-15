import fastify from 'fastify';
import fastifySwagger, { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import fastifySwaggerUi, { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ServerConfig, FastifySeverInstance } from './types';
import fastifyJwt from '@fastify/jwt';

/**
 * Fastify-based API server implementation.
 * Provides a configurable HTTP server with support for CORS, Swagger documentation,
 * and custom route registration.
 * Implements the Singleton pattern to ensure only one server instance exists.
 */
export class FastifyAPIServer {
  private static instance: FastifyAPIServer;
  private fastify: FastifySeverInstance;
  private readonly port: number;
  private readonly host: string;
  private corsOrigins: string | string[];
  private swagger: FastifyDynamicSwaggerOptions;
  private swaggerUi: FastifySwaggerUiOptions;
  private jwtSecret: string;
  private logger: AbstractLogger;

  /**
   * Private constructor to enforce singleton pattern.
   * @param config - Server configuration parameters including port, host,
   * @param logger - Logger for the class to log. A DummyLogger by default
   */
  private constructor(config: ServerConfig, logger?: AbstractLogger) {
    this.logger = logger ?? new DummyLogger();
    this.port = config.port;
    this.host = config.host;
    this.corsOrigins = config.corsOrigins;
    this.swagger = config.swagger;
    this.swaggerUi = config.swaggerUi;
    this.jwtSecret = config.jwtSecret;

    this.fastify = fastify({
      logger: config.activeFastifyLogger,
    });
  }

  /**
   * Gets the singleton instance of FastifyAPIServer.
   * @returns The singleton instance of FastifyAPIServer
   * @throws {Error} If the instance has not been initialized
   */
  public static getInstance = (): FastifyAPIServer => {
    if (!this.instance) {
      throw new Error('FastifyAPIServer instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Initializes the singleton instance with the provided configuration.
   * @param config - Server configuration parameters
   * @param logger - The logger of the class
   * @returns The initialized FastifyAPIServer instance
   */
  public static initialize = async (
    config: ServerConfig,
    logger?: AbstractLogger,
  ): Promise<void> => {
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

    await this.instance.fastify.register(fastifyJwt, {
      secret: this.instance.jwtSecret,
    });

    await this.instance.fastify.register(fastifySwagger, this.instance.swagger);
    await this.instance.fastify.register(
      fastifySwaggerUi,
      this.instance.swaggerUi,
    );

    this.instance.logger.info(`FastifyAPIServer initialized successfully.`);
  };

  /**
   * Registers routes with a common prefix in Fastify using a callback function.
   *
   * This function takes a callback that receives a Fastify instance for route registration
   * and a prefix string. It allows you to organize and group related routes together
   * under the specified prefix.
   *
   * @param {(fastify: FastifySeverInstance) => void} routeCallback - A callback function that takes a Fastify instance
   *   and registers routes on it. This follows Fastify's plugin route registration pattern.
   * @param {string} prefix - The prefix to prepend to all routes registered in the callback.
   * @returns {void}
   */
  public register = async (
    routeCallback: (fastify: FastifySeverInstance) => Promise<void>,
    prefix: string,
  ): Promise<void> => {
    await this.fastify.register(routeCallback, { prefix });
    this.logger.debug(
      `The prefix: ${prefix} has been registered successfully.`,
    );
  };

  /**
   * Starts the server and begins listening for requests.
   * @returns Promise that resolves when the server is listening
   * @throws {Error} If server fails to start
   * @example
   * await server.start();
   */
  public start = async () => {
    await this.fastify.listen({
      port: this.port,
      host: this.host,
    });
    this.logger.info(`Server listening on ${this.host}:${this.port}`);
    this.logger.info(
      `Swagger docs available at ${this.host}:${this.port}/docs`,
    );
  };

  /**
   * Generate a signed JWT.
   * @param payload - Payload to include in the JWT.
   */
  public signJWT = <T extends object>(payload: T): string => {
    return this.fastify.jwt.sign(payload);
  };

  /**
   * Verify a JWT and return the decoded payload.
   * @param token - The JWT token string.
   */
  public verifyJWT = <T extends object>(token: string): T => {
    return this.fastify.jwt.verify<T>(token);
  };

  /**
   * Closes the already running server
   * @returns Promise that resolves when the server is closed
   * @throws {Error} If server fails to close
   * @example
   * await server.close();
   */
  public close = async () => {
    await this.fastify.close();
    this.logger.info(`Server has been closed succeessfully`);
  };
}
