import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyAPIServer,
  FastifySeverInstance,
} from '@ergo-faucet/fastify-server';
import { RequestHistoryAction } from '@ergo-faucet/database';
import {
  ErrorResponse,
  GetRequestHistoryResponse200,
  RequsetHistoryRouteQuery,
} from './types';

class RequestHistoryController {
  private readonly logger: AbstractLogger;
  private readonly requestHistoryAction: RequestHistoryAction;
  private readonly PACKAGES_PREFIX = '/history';
  private readonly fastifyServer: FastifyAPIServer;

  /**
   * Constructs a new RequestController.
   * @param RequestController - Instance of RequestController for DB operations.
   * @param logger - Optional logger instance.
   */
  public constructor(
    requestHistoryAction: RequestHistoryAction,
    fastifyServer: FastifyAPIServer,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ? logger : new DummyLogger();
    this.requestHistoryAction = requestHistoryAction;
    this.fastifyServer = fastifyServer;
  }

  public fetchRequestsHistoryRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.get(
      '',
      {
        schema: {
          querystring: RequsetHistoryRouteQuery,
          response: {
            200: GetRequestHistoryResponse200,
            500: ErrorResponse,
          },
        },
      },
      async (request, reply) => {
        const { offset, limit, sort, order } = request.query;

        try {
          const requestDTOs = await this.requestHistoryAction.getRequestHistory(
            offset,
            limit,
            sort,
            order,
          );
          return reply.status(200).send(requestDTOs);
        } catch (err) {
          this.logger.error(
            `Error fetching packages: ${
              (err instanceof Error ? err.message : err,
              err instanceof Error ? err.stack : undefined)
            }`,
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
   * Registers all request-related API routes under the specified prefix
   * on the provided FastifyAPIServer instance.
   *
   * @param fastifyServer - The FastifyAPIServer instance to register routes on.
   * @param prefix - The URL prefix under which to register the routes (e.g., '/controller').
   * @returns {Promise<void>}
   */
  public registerRoutes = async (prefix: string): Promise<void> => {
    await this.fastifyServer.register(
      this.fetchRequestsHistoryRoute,
      prefix + this.PACKAGES_PREFIX,
    );
    this.logger.info(
      `RequsetH routes registered under prefix "${prefix + this.PACKAGES_PREFIX}"`,
    );
  };
}

export { RequestHistoryController };
