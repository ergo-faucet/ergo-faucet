import { userRequestPayload } from '@ergo-faucet/common-types';
import {
  PackageAction,
  RequestLimitError,
  NotFoundError,
  NotAvailableError,
  DuplicateItemError,
} from '@ergo-faucet/database';
import {
  isValidErgoAddress,
  NodeModel,
  TokenNotFoundError,
  InvalidTokenPrecisionError,
} from '@ergo-faucet/ergo-utils';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { Network } from '@fleet-sdk/common';
import { Static } from '@sinclair/typebox';

import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import {
  ErrorResponse,
  GetPackagesResponse200,
  PackagesRouteQuery,
  RequestPackageBody,
  RequestPackageBodyType,
  AddPackageBodyType,
  RequestPackageResponse200,
  AddPackageResponse200,
  AddPackageBody,
  PackageControllerConfig,
  AddAssetsToPackageBodyType,
  AddAuthMethodsToPackageBodyType,
  AddAssetsToPackageBody,
  AddAssetsToPackageResponse200,
  AddAuthMethodsToPackageResponse200,
  UpdatePackageParams,
  AddAuthMethodsToPackageBody,
} from './types';
import { processAssets } from './utils';

class PackageController {
  private readonly logger: AbstractLogger;
  private readonly packageAction: PackageAction;
  private readonly PACKAGES_PREFIX = '/packages';
  private readonly fastifyServer: FastifyAPIServer;
  private readonly nodeModel: NodeModel;
  private readonly NETWORK_TYPE: Network;

  /**
   * Constructs a new PackageController instance.

   * @param config - The configuration object for the controller.
   *   - packageAction: Instance of PackageAction for DB operations.
   *   - fastifyServer: FastifyAPIServer instance for route registration.
   *   - nodeModel: NodeModel instance for token operations.
   *   - networkType: Network type (e.g., Mainnet, Testnet).
   *   - logger: Optional logger instance.
   */
  public constructor(config: PackageControllerConfig) {
    this.logger = config.logger ? config.logger : new DummyLogger();
    this.packageAction = config.packageAction;
    this.fastifyServer = config.fastifyServer;
    this.nodeModel = config.nodeModel;
    this.NETWORK_TYPE = config.networkType;
  }

  /**
   * Registers the /packages GET route on the provided Fastify instance.
   * Handles query parameters for pagination and sorting, and returns a list of packages.
   * Includes user authentication status data when a valid JWT token is provided.
   * Responds with 200 and a list of packages, 401 for invalid token, or 500 if an internal server error occurs.
   *
   * @param fastify - The Fastify server instance to register the route on.
   * @returns {Promise<void>}
   */
  public fetchPackagesRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.get(
      '',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: this.fastifyServer.authPreHandler(false),
        schema: {
          querystring: PackagesRouteQuery,
          response: {
            200: GetPackagesResponse200,
            400: ErrorResponse,
            500: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (request, reply) => {
        const { offset, limit, sort, order, ...options } = request.query;
        const user = request.user as userRequestPayload;

        try {
          const packages = await this.packageAction.getPackages(
            offset,
            limit,
            sort,
            order,
            options,
            user?.userId,
          );

          return reply.status(200).send(packages);
        } catch (error) {
          this.logger.error(`Error fetching packages:`, {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          });

          reply.status(500).send({
            error: 'Internal server error occured',
            code: 'internal-error',
          });
        }
      },
    );
  };

  /**
   * Registers the /packages/request POST route on the provided Fastify instance.
   * Handles user requests for packages, including authentication and captcha checks.
   * Validates package availability and required authentication methods.
   * Adds a new user request if all checks pass.
   *
   * @param fastify - The Fastify server instance to register the route on.
   * @returns {Promise<void>}
   */
  public requestPackageRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: RequestPackageBodyType }>(
      '/request',
      {
        preHandler: [
          this.fastifyServer.authPreHandler(),
          this.fastifyServer.captchaPreHandler,
          async (req, res) => {
            const { destAddress } = req.body;
            if (!isValidErgoAddress(destAddress, this.NETWORK_TYPE)) {
              return res.status(400).send({
                error: 'Invalid Ergo address',
                code: 'invalid-address-network',
              });
            }
          },
        ],
        schema: {
          body: RequestPackageBody,
          response: {
            200: RequestPackageResponse200,
            400: ErrorResponse,
            403: ErrorResponse,
            500: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },

      async (request, reply) => {
        this.logger.debug(`New request for package ${request.body.packageId}`);
        const user = request.user as userRequestPayload;
        const { packageId, destAddress } = request.body;

        try {
          await this.packageAction.isPackageAvailableForUser(
            user.userId,
            packageId,
          );
          const isValid = await this.packageAction.hasUserPassedAllAuthMethods(
            user.userId,
            packageId,
          );
          if (!isValid) {
            return reply
              .status(403)
              .send({ error: 'forbidden', code: 'AUTH_METHODS_INCOMPLETE' });
          }
          const requestId = await this.packageAction.addUserRequest(
            user.userId,
            packageId,
            destAddress,
          );
          this.logger.debug(
            `UserRequest with ID: ${requestId} successfully added for userId=${user.userId}, packageId=${packageId}`,
          );
          return reply.status(200).send({ requestId });
        } catch (error) {
          if (error instanceof NotFoundError) {
            this.logger.debug(error.message);
            return reply
              .status(404)
              .send({ error: error.message, code: 'NOT_FOUND' });
          }
          if (error instanceof RequestLimitError) {
            this.logger.debug(error.message);
            return reply
              .status(403)
              .send({ error: error.message, code: 'REQUEST_LIMIT' });
          } else if (error instanceof NotAvailableError) {
            this.logger.debug(error.message);
            return reply
              .status(403)
              .send({ error: error.message, code: 'NOT_AVAILABLE' });
          } else {
            this.logger.error(
              `Error requesting package  ${packageId} for userId=${user.userId}`,
              {
                error: error instanceof Error ? error.message : 'unknown error',
                stack: error instanceof Error ? error.stack : undefined,
              },
            );
            return reply.status(500).send({
              error: 'Internal server error occured',
              code: 'internal-error',
            });
          }
        }
      },
    );
  };

  /**
   * Registers the /packages POST route on the provided Fastify instance.
   * Handles adding a new package, including asset processing and authentication method validation.
   *
   * @param fastify - The Fastify server instance to register the route on.
   * @returns {Promise<void>}
   */
  public addPackageRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: AddPackageBodyType }>(
      '',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: [
          this.fastifyServer.authPreHandler(),
          this.fastifyServer.adminPreHandler,
        ],
        schema: {
          body: AddPackageBody,
          response: {
            200: AddPackageResponse200,
            400: ErrorResponse,
            500: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },

      async (request, reply) => {
        try {
          const user = request.user as userRequestPayload;

          // Validate admin privileges in database
          const isValid = await this.packageAction.validateAdminRequest(
            user.userId,
          );
          if (!isValid) {
            this.logger.debug(`User ${user.userId} failed admin validation.`);

            return reply.status(403).send({ error: 'Forbidden' });
          }

          // Add package to database
          const packageId = await this.packageAction.addPackage(request.body);
          this.logger.debug(`Package with ID: ${packageId} successfully added`);

          return reply.status(200).send({
            packageId,
          });
        } catch (error) {
          this.logger.error(`Unexpected error during adding package`, {
            message: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          });
          return reply.status(500).send({
            error: 'Internal server error occurred',
            code: 'internal-error',
          });
        }
      },
    );
  };

  /**
   * Registers the /packages/:packageId/assets POST route on the provided Fastify instance.
   * Handles adding new assets to an existing package, including admin validation and asset processing.
   * Responds with 200 and the added asset IDs on success, 404 if the package is not found,
   * 400 for token or precision errors, or 500 for internal errors.
   *
   * @param fastify - The Fastify server instance to register the route on.
   * @returns {Promise<void>}
   */
  public addAssetsToPackageRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{
      Body: AddAssetsToPackageBodyType;
    }>(
      '/:packageId/assets',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: [
          this.fastifyServer.authPreHandler(),
          this.fastifyServer.adminPreHandler,
        ],
        schema: {
          body: AddAssetsToPackageBody,
          params: UpdatePackageParams,
          response: {
            200: AddAssetsToPackageResponse200,
            404: ErrorResponse,
            400: ErrorResponse,
            500: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (request, reply) => {
        const { packageId } = request.params as Static<
          typeof UpdatePackageParams
        >;
        const user = request.user as userRequestPayload;

        try {
          // Validate admin privileges in database
          const isValid = await this.packageAction.validateAdminRequest(
            user.userId,
          );
          if (!isValid) {
            this.logger.debug(`User ${user.userId} failed admin validation.`);

            return reply.status(403).send({ error: 'Forbidden' });
          }

          // Validate package existence
          const pkg = await this.packageAction.getPackageById(packageId);

          // Process assets
          const assets = await processAssets(request.body, this.nodeModel);

          // Add assets to package
          const addedAssets = await this.packageAction.addAssets(assets, pkg);

          this.logger.debug(
            `Assets successfully added to package with ID: ${pkg.id}`,
          );
          return reply.status(200).send({ addedAssets: addedAssets });
        } catch (error) {
          if (error instanceof NotFoundError) {
            this.logger.debug(`Package not found: ${error.message}`);

            return reply
              .status(404)
              .send({ error: error.message, code: 'PACKAGE_NOT_FOUND' });
          } else if (error instanceof TokenNotFoundError) {
            this.logger.debug(`Token not found: ${error.message}`);

            return reply
              .status(400)
              .send({ error: error.message, code: 'TOKEN_NOT_FOUND' });
          } else if (error instanceof InvalidTokenPrecisionError) {
            this.logger.debug(`Invalid token precision: ${error.message}`);

            return reply
              .status(400)
              .send({ error: error.message, code: 'INVALID_PRECISION' });
          } else {
            this.logger.error(`Unexpected error during adding package`, {
              message: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined,
            });

            return reply.status(500).send({
              error: 'Internal server error occurred',
              code: 'internal-error',
            });
          }
        }
      },
    );
  };

  /**
   * Registers the /packages/:packageId/assets POST route for adding authentication methods to a package.
   * Handles admin validation, package existence, and authentication method validation.
   * Responds with 200 on success, 404 if the package is not found, 400 for invalid auth methods,
   * or 500 for internal errors.
   *
   * @param fastify - The Fastify server instance to register the route on.
   * @returns {Promise<void>}
   */
  public addAuthMethodsToPackageRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: AddAuthMethodsToPackageBodyType }>(
      '/:packageId/auths',
      {
        errorHandler: this.fastifyServer.errorHandler,
        preHandler: [
          this.fastifyServer.authPreHandler(),
          this.fastifyServer.adminPreHandler,
        ],
        schema: {
          body: AddAuthMethodsToPackageBody,
          params: UpdatePackageParams,
          response: {
            200: AddAuthMethodsToPackageResponse200,
            404: ErrorResponse,
            400: ErrorResponse,
            500: ErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (request, reply) => {
        const { packageId } = request.params as Static<
          typeof UpdatePackageParams
        >;
        const user = request.user as userRequestPayload;
        const authMethods = request.body;
        try {
          // Validate admin privileges in database
          const isValid = await this.packageAction.validateAdminRequest(
            user.userId,
          );
          if (!isValid) {
            this.logger.debug(`User ${user.userId} failed admin validation.`);

            return reply.status(403).send({ error: 'Forbidden' });
          }

          // Validate package existence
          const pkg = await this.packageAction.getPackageById(packageId);

          // Validate auth methods
          await this.packageAction.validateAuthMethods(
            authMethods.map((am) => am.id),
          );

          // Avoid duplicate auth methos
          this.packageAction.avoidDuplicateAuthMethod(
            pkg,
            authMethods.map((am) => am.id),
          );

          // Save to database
          const addedAuthIds = await this.packageAction.addPackageAuthMethods(
            authMethods,
            pkg,
          );

          this.logger.debug(
            `Assets successfully added to package with ID: ${pkg.id}`,
          );
          return reply.status(200).send({ addedAuthIds });
        } catch (error) {
          if (
            error instanceof NotFoundError &&
            (error.message.includes('package') ||
              error.message.includes('Package'))
          ) {
            this.logger.debug(`Package not found: ${error.message}`);

            return reply
              .status(404)
              .send({ error: error.message, code: 'PACKAGE_NOT_FOUND' });
          } else if (
            error instanceof NotFoundError &&
            error.message.includes('auth')
          ) {
            this.logger.debug(`Auth not found: ${error.message}`);
            return reply
              .status(400)
              .send({ error: error.message, code: 'AUTH_NOT_FOUND' });
          } else if (error instanceof DuplicateItemError) {
            return reply
              .status(400)
              .send({ error: error.message, code: 'DUPLICATE_AUTH' });
          } else {
            this.logger.error(`Unexpected error during adding package`, {
              message: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined,
            });

            return reply.status(500).send({
              error: 'Internal server error occurred',
              code: 'internal-error',
            });
          }
        }
      },
    );
  };

  /**
   * Registers all package-related API routes under the specified prefix
   * on the provided FastifyAPIServer instance.
   *
   * @param fastifyServer - The FastifyAPIServer instance to register routes on.
   * @param prefix - The URL prefix under which to register the routes (e.g., '/controller').
   * @returns {Promise<void>}
   */
  public registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(
      this.fetchPackagesRoute,
      prefix + this.PACKAGES_PREFIX,
    );
    await this.fastifyServer.register(
      this.addPackageRoute,
      prefix + this.PACKAGES_PREFIX,
    );
    await this.fastifyServer.register(
      this.requestPackageRoute,
      prefix + this.PACKAGES_PREFIX,
    );
    await this.fastifyServer.register(
      this.addAssetsToPackageRoute,
      prefix + this.PACKAGES_PREFIX,
    );

    await this.fastifyServer.register(
      this.addAuthMethodsToPackageRoute,
      prefix + this.PACKAGES_PREFIX,
    );

    this.logger.info(
      `PackageController routes registered under prefix "${prefix + this.PACKAGES_PREFIX}"`,
    );
  };
}

export { PackageController };
