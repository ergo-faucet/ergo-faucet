import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import fastifySwagger, { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import fastifySwaggerUi, { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ServerConfig, FastifySeverInstance, CookieConfig } from './types';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import {
  GoogleRecaptcha,
  RecaptchaClientError,
  RecaptchaServerError,
} from '@ergo-faucet/google-recaptcha';

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
  private jwtExpiration: number;
  private cookieConfig: CookieConfig;
  private logger: AbstractLogger;
  private googleRecaptcha: GoogleRecaptcha;

  /**
   * Private constructor to enforce singleton pattern.
   * @param config - Server configuration parameters including port, host,..
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
    this.jwtExpiration = config.jwtExpiration;
    this.cookieConfig = config.cookie;
    this.googleRecaptcha = config.googleRecaptcha;

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
    if (this.instance.corsOrigins.includes('*')) {
      await this.instance.fastify.register(fastifyCors, { credentials: true });
    } else {
      await this.instance.fastify.register(fastifyCors, {
        credentials: true,
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const allowedOrigins = Array.isArray(this.instance.corsOrigins)
            ? this.instance.corsOrigins
            : [this.instance.corsOrigins];
          if (allowedOrigins.some((item) => origin === item)) {
            return callback(null, true);
          }
          return callback(null, false);
        },
      });
    }

    await this.instance.fastify.register(cookie, {
      secret: this.instance.cookieConfig.secret,
    });

    await this.instance.fastify.register(jwt, {
      secret: this.instance.jwtSecret,
      cookie: {
        cookieName: this.instance.cookieConfig.name,
        signed: this.instance.cookieConfig.signed,
      },
      sign: { expiresIn: this.instance.jwtExpiration },
    });

    await this.instance.fastify.register(fastifySwagger, this.instance.swagger);
    await this.instance.fastify.register(
      fastifySwaggerUi,
      this.instance.swaggerUi,
    );
    this.instance.fastify.get('/', async (_, reply) => {
      return reply.redirect(this.instance.swaggerUi.routePrefix || '');
    });

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
   * Sets an authentication cookie in the response.
   * @param reply - The Fastify reply object to set the cookie on.
   * @param token - The JWT token to set in the cookie.
   * @returns void
   * @throws {Error} If the reply object is not provided or if the token is invalid.
   */
  public setAuthCookie = (reply: FastifyReply, token: string): void => {
    reply.setCookie(this.cookieConfig.name, token, {
      httpOnly: this.cookieConfig.httpOnly,
      secure: this.cookieConfig.secure,
      sameSite: this.cookieConfig.sameSite,
      path: this.cookieConfig.path,
      domain: this.cookieConfig.domain,
      maxAge: this.cookieConfig.maxAge || this.jwtExpiration,
    });
    this.logger.debug(
      `Authentication cookie set with name: ${this.cookieConfig.name}`,
    );
  };

  /**
   * Pre-handler hook that verifies JWT before executing the route handler.
   * If JWT validation fails, it sends an error Unauthorized.
   * @param req - FastifyRequest (expects `JWT token`)
   * @param res - FastifyReply (used to send early error responses)
   *
   */
  public authPreHandler = async <
    T extends FastifyRequest,
    U extends FastifyReply,
  >(
    req: T,
    res: U,
  ) => {
    try {
      await req.jwtVerify();
    } catch {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  };

  /**
   * Pre-handler hook that verifies captcha before executing the route handler.
   * If captcha validation fails, it sends an error response.
   * @param req - FastifyRequest (expects `captchaToken` inside request body)
   * @param res - FastifyReply (used to send early error responses)
   *
   */
  public captchaPreHandler = async <
    T extends FastifyRequest,
    U extends FastifyReply,
  >(
    req: T,
    res: U,
  ) => {
    const { captchaToken } = req.body as { captchaToken: string };

    try {
      if (!captchaToken) {
        return res.status(400).send({
          code: 'missing-captcha-token',
          error: 'Captcha token is required',
        });
      }

      const isValid = await this.googleRecaptcha.verifyToken(captchaToken);

      if (!isValid) {
        return res.status(400).send({
          code: 'invalid-captcha-token',
          error: 'Invalid captcha token',
        });
      }
    } catch (err) {
      if (err instanceof RecaptchaClientError) {
        return res.status(400).send({
          code: 'captcha-verification-failed',
          error: err.message,
        });
      } else if (err instanceof RecaptchaServerError) {
        return res.status(500).send({
          code: 'captcha-verification-failed',
          error: 'Internal server error during captcha verification',
        });
      } else if (err instanceof Error) {
        this.logger.debug('captcha-verification-failed', {
          message: err.message,
          stack: err.stack,
        });
        return res.status(500).send({
          code: 'captcha-verification-failed',
          error: 'Internal server error during captcha verification',
        });
      }
    }
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
