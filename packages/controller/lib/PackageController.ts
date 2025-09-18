import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';

import {
  PackageAction,
  RequestLimitError,
  NotFoundError,
} from '@ergo-faucet/database';
import {
  ErrorResponse,
  GetPackagesResponse200,
  PackagesRouteQuery,
  RequestPackageBody,
  RequestPackageBodyType,
  RequestPackageResponse200,
} from './types';
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
   * @param fastifyServer - Instance of fastify server
   * @param NETWORK_TYPE - The network type (e.g., mainnet, testnet).
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
        preHandler: this.fastifyServer.authPreHandler(false),
        schema: {
          querystring: PackagesRouteQuery,
          response: {
            200: GetPackagesResponse200,
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
        const { offset, limit, sort, order } = request.query;
        const user = request.user as userRequestPayload;

        try {
          const packages = await this.packageAction.getPackages(
            offset,
            limit,
            sort,
            order,
            user?.userId,
          );

          return reply.status(200).send(packages);
        } catch (err) {
          this.logger.error(
            `Error fetching packages: ${(err instanceof Error ? err.message : err, err instanceof Error ? err.stack : undefined)}`,
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
