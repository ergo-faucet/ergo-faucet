import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import {
  GetPackageErrorResponse,
  GetPackagesResponse200,
  PackagesRouteQuery,
} from './types/packagesRouteSchemas';
import { PackageAction } from '@ergo-faucet/database';
import { toPackageDTO } from './utils/mapper';
import { PackageDTO } from './types/DTOs';

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
            500: GetPackageErrorResponse,
          },
        },
      },
      async (request, reply) => {
        const offset = request.query.offset;
        const limit = request.query.limit;
        const sort = request.query.sort;
        const order = request.query.order;

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
