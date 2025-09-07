import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifyReply,
  FastifyRequest,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import {
  RequestLimitError,
  NotFoundError,
  PackageAction,
} from '@ergo-faucet/database';
import {
  ErrorResponse,
  GetPackagesResponse200,
  PackagesRouteQuery,
  RequestPackageBody,
  RequestPackageBodyType,
  PackageDTO,
  AddPackageBodyType,
} from './types';
import { toPackageDTO } from './utils';
import { userRequestPayload } from '@ergo-faucet/common-types';
import { isValidErgoAddress } from '@ergo-faucet/ergo-utils';
import { Network } from '@fleet-sdk/common';

class PackageController {
  private readonly logger: AbstractLogger;
  private readonly packageAction: PackageAction;
  private readonly PACKAGES_PREFIX = '/packages';
  private readonly fastifyServer: FastifyAPIServer;

  /**
   * Constructs a new PackageController.
   * @param packageAction - Instance of PackageAction for DB operations.
   * @param logger - Optional logger instance.
   */
  public constructor(
    packageAction: PackageAction,
    fastifyServer: FastifyAPIServer,
    private readonly NETWORK_TYPE: Network,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ? logger : new DummyLogger();
    this.packageAction = packageAction;
    this.fastifyServer = fastifyServer;
  }

  /**
   * Registers the /packages GET route on the provided Fastify instance.
   * Handles query parameters for pagination and sorting, and returns a list of packages.
   * Responds with 200 and a list of packages or 500 if an internal server error occurs.
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
        schema: {
          querystring: PackagesRouteQuery,
          response: {
            200: GetPackagesResponse200,
            500: ErrorResponse,
          },
        },
      },
      async (request, reply) => {
        const { offset, limit, sort, order } = request.query;

        try {
          const packages = await this.packageAction.getPackages(
            offset,
            limit,
            sort,
            order,
          );

          const packageDTOs: PackageDTO[] = toPackageDTO(packages);

          return reply.status(200).send(packageDTOs);
        } catch (err) {
          this.logger.error(
            `Error fetching packages: ${err instanceof Error ? err.message : err}`,
          );
          reply.status(500).send({
            error: 'Internal server error occured',
            code: 'internal-error',
          });
        }
      },
    );
  };

  /**
   * Pre-handler for admin-only routes.
   * Verifies that the user is an admin and has valid admin privileges.
   * Responds with 403 if the user is not authorized, or 500 on internal error.
   *
   * @param req - Fastify request object containing user payload.
   * @param res - Fastify reply object for sending responses.
   * @returns {Promise<void>}
   */
  public adminPreHandler = async <
    T extends FastifyRequest,
    U extends FastifyReply,
  >(
    req: T,
    res: U,
  ) => {
    try {
      // Extract user payload from request
      const user = req.user as userRequestPayload;

      // Check if user has admin flag
      if (!user.isAdmin) {
        this.logger.debug(`User ${user.userId} is not marked as admin.`);
        return res.status(403).send({ error: 'Forbidden' });
      }

      // Validate admin privileges in database
      const isValid = await this.packageAction.validateAdminRequest(
        user.userId,
      );
      if (!isValid) {
        this.logger.debug(`User ${user.userId} failed admin validation.`);

        return res.status(403).send({ error: 'Forbidden' });
      }
    } catch (err) {
      this.logger.error('Admin pre-handler error', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      return res.status(500).send({
        error: 'Internal server error during admin validation',
        code: 'admin-validation-error',
      });
    }
  };

  /**
   * Registers the /packages/request POST route on the provided Fastify instance.
   * Handles user requests for packages, including authentication and captcha checks.
   * Validates userId, package availability, and required authentication methods.
   * Adds a new user request if all checks pass.
   * Responds with 200 on success, 400 for missing userId, 403 if auth methods are incomplete,
   * 404 if user or package not found, 403 if request limit is active, or 500 for internal errors.
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
          this.fastifyServer.authPreHandler,
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
            400: ErrorResponse,
            403: ErrorResponse,
            500: ErrorResponse,
          },
        },
      },

      async (request, reply) => {
        this.logger.debug(`New request for package ${request.body.packageId}`);
        const user = request.user as userRequestPayload;
        if (!user.userId) {
          return reply
            .status(400)
            .send({ error: 'Missing userId', code: 'Bad Request' });
        }

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
          return reply.status(200).send();
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

  public addPackageRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: AddPackageBodyType }>(
      '/request',
      {
        preHandler: [this.fastifyServer.authPreHandler, this.adminPreHandler],
        schema: {
          body: RequestPackageBody,
          response: {
            400: ErrorResponse,
            500: ErrorResponse,
            404: ErrorResponse,
          },
        },
      },

      async (request, reply) => {
        const copyOfAssets = structuredClone(request.body.assets);
        try {
          // Process assets
          const assets = await this.processAssets(copyOfAssets);

          // Validate auth methods
          this.packageAction.validateAuthMethods(
            request.body.authMethods.map((am) => am.id),
          );

          const packageData = { ...request.body, assets };

          // Add package to database
          const packageId = await this.packageAction.addPackage(packageData);
          this.logger.debug(`Package with ID: ${packageId} successfully added`);

          return reply.status(200).send({
            packageId,
          });
        } catch (error) {
          // TODO

          if (error instanceof NotFoundError) {
            this.logger.debug(error.message);
            return reply
              .status(404)
              .send({ error: error.message, code: 'NOT_FOUND' });
          }

          this.logger.debug(
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      },
    );
  };

  processAssets = async (
    assets: {
      tokenId: string;
      amount: number;
      usageDescription: string;
    }[],
  ): Promise<
    {
      tokenId: string;
      amount: bigint;
      decimals: number;
      usageDescription: string;
    }[]
  > => {
    this.logger.debug(JSON.stringify(assets));
    throw new Error('Method not implemented.');
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
    this.logger.info(
      `PackageController routes registered under prefix "${prefix + this.PACKAGES_PREFIX}"`,
    );
  };
}

export { PackageController };
