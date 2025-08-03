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
import { toPackageDto } from './utils/mapper';
import { PackageDto } from './types/Dtos';

class PackageController {
  private static instance: PackageController;
  private readonly logger: AbstractLogger;
  private readonly packageAction: PackageAction;
  private readonly PACKAGES_PREFIX = '/packages';

  /**
   * Private constructor to enforce singleton pattern.
   * @param packageAction - The PackageAction instance for data access.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  private constructor(packageAction: PackageAction, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.packageAction = packageAction;
  }

  /**
   * Returns the singleton instance of PackageController.
   * Throws an error if not yet initialized.
   * @returns {PackageController} The singleton instance.
   */
  public static getInstance = (): PackageController => {
    if (!this.instance) {
      throw new Error('PackageController instance has not been initialized.');
    }
    return PackageController.instance;
  };

  /**
   * Initializes the PackageController singleton with the given PackageAction and optional logger.
   * Throws an error if already initialized.
   * @param packageAction - The PackageAction instance for data access.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  public static initialize = (
    packageAction: PackageAction,
    logger?: AbstractLogger,
  ) => {
    if (this.instance) {
      throw new Error(
        'PackageController instance has already been initialized.',
      );
    }
    this.instance = new PackageController(packageAction, logger);
    this.instance.logger.info(`PackageController initialized successfully.`);
  };

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

          const packageDtos: PackageDto[] = toPackageDto(packages);

          return reply.status(200).send(packageDtos);
        } catch (err) {
          this.logger.debug(
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
