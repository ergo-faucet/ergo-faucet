import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { FastifySeverInstance } from '@ergo-faucet/fastify-server';
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

  private constructor(packageAction: PackageAction, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.packageAction = packageAction;
  }

  public static getInstance = (): PackageController => {
    if (!this.instance) {
      throw new Error('PackageController instance has not been initialized.');
    }
    return PackageController.instance;
  };

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

  public fetchPackagesRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.get(
      '/packages',
      {
        schema: {
          querystring: PackagesRouteQuery,
          response: {
            200: GetPackagesResponse200,
            404: GetPackageErrorResponse,
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
          if (packages.length == 0)
            return reply.status(404).send({
              error: 'No packages found matching the query parameters.',
              code: 'NOT_FOUND',
            });
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
}

export { PackageController };
