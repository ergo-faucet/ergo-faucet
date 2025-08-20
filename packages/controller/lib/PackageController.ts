import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';

import { PackageAction, UserAuthStatus } from '@ergo-faucet/database';
import { toPackageDTO } from './utils';
import {
  PackageDTO,
  GetPackageErrorResponse,
  GetPackagesResponse200,
  PackagesRouteQuery,
} from './types';
import { userRequestPayload } from '@ergo-faucet/common-types';

class PackageController {
  private readonly logger: AbstractLogger;
  private readonly packageAction: PackageAction;
  private readonly PACKAGES_PREFIX = '/packages';

  /**
   * Constructs a new PackageController.
   * @param packageAction - Instance of PackageAction for DB operations.
   * @param logger - Optional logger instance.
   */
  public constructor(packageAction: PackageAction, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.packageAction = packageAction;
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
        schema: {
          querystring: PackagesRouteQuery,
          response: {
            200: GetPackagesResponse200,
            500: GetPackageErrorResponse,
          },
          security: [
            {
              bearerAuth: [],
            },
          ],
        },
      },
      async (request, reply) => {
        const offset = request.query.offset;
        const limit = request.query.limit;
        const sort = request.query.sort;
        const order = request.query.order;
        if (request.headers.authorization?.startsWith('Bearer ')) {
          try {
            await request.jwtVerify();
          } catch {
            return reply
              .status(401)
              .send({ error: 'Invalid token', code: 'unauthorized' });
          }
        }
        const user = request.user as userRequestPayload;

        try {
          const packages = await this.packageAction.getPackages(
            offset,
            limit,
            sort,
            order,
          );

          let userStatuses: UserAuthStatus[] | undefined;
          if (user?.userId) {
            userStatuses = await this.packageAction.getUserAuthStatuses(
              user.userId,
            );
          }

          const packageDTOs: PackageDTO[] = toPackageDTO(
            packages,
            userStatuses,
          );

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
   * Registers all package-related API routes under the specified prefix
   * on the provided FastifyAPIServer instance.
   *
   * @param fastifyServer - The FastifyAPIServer instance to register routes on.
   * @param prefix - The URL prefix under which to register the routes (e.g., '/controller').
   * @returns {Promise<void>}
   */
  public registerRoutes = async (
    fastifyServer: FastifyAPIServer,
    prefix: string,
  ): Promise<void> => {
    await fastifyServer.register(
      this.fetchPackagesRoute,
      prefix + this.PACKAGES_PREFIX,
    );
    this.logger.info(
      `PackageController routes registered under prefix "${prefix + this.PACKAGES_PREFIX}"`,
    );
  };
}

export { PackageController };
