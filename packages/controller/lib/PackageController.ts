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
  AssetPayload,
} from '@ergo-faucet/database';
import {
  ErrorResponse,
  GetPackagesResponse200,
  PackagesRouteQuery,
  RequestPackageBody,
  RequestPackageBodyType,
  PackageDTO,
  AddPackageBodyType,
  RequestPackageResponse200,
  AddPackageResponse200,
  AddPackageBody,
  PackageControllerConfig,
  UserProvidedAsset,
} from './types';
import { toPackageDTO } from './utils';
import { userRequestPayload } from '@ergo-faucet/common-types';
import {
  isValidErgoAddress,
  NodeModel,
  validateAmountPrecision,
  TokenNotFoundError,
  InvalidTokenPrecisionError,
} from '@ergo-faucet/ergo-utils';
import { Network } from '@fleet-sdk/common';
import { Static } from '@sinclair/typebox';

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
   * Registers the /packages/add POST route on the provided Fastify instance.
   * Handles adding a new package, including asset processing and authentication method validation.
   *
   * @param fastify - The Fastify server instance to register the route on.
   * @returns {Promise<void>}
   */
  public addPackageRoute = async (
    fastify: FastifySeverInstance,
  ): Promise<void> => {
    fastify.post<{ Body: AddPackageBodyType }>(
      '/add',
      {
        preHandler: [this.fastifyServer.authPreHandler, this.adminPreHandler],
        schema: {
          body: AddPackageBody,
          response: {
            200: AddPackageResponse200,
            400: ErrorResponse,
            500: ErrorResponse,
          },
        },
      },

      async (request, reply) => {
        try {
          // Process assets
          const assets = await this.processAssets(request.body.assets);

          // Validate auth methods
          this.packageAction.validateAuthMethods(
            request.body.authMethods.map((am) => am.id),
          );

          const packagePayload = { ...request.body, assets };

          // Add package to database
          const packageId = await this.packageAction.addPackage(packagePayload);
          this.logger.debug(`Package with ID: ${packageId} successfully added`);

          return reply.status(200).send({
            packageId,
          });
        } catch (error) {
          console.log(error);
          if (error instanceof TokenNotFoundError) {
            this.logger.debug(`Token not found: ${error.message}`);
            return reply
              .status(400)
              .send({ error: error.message, code: 'TOKEN_NOT_FOUND' });
          } else if (error instanceof InvalidTokenPrecisionError) {
            this.logger.debug(`Invalid token precision: ${error.message}`);
            return reply
              .status(400)
              .send({ error: error.message, code: 'INVALID_PRECISION' });
          } else if (error instanceof NotFoundError) {
            this.logger.debug(
              `Not found error (likely auth methods): ${error.message}`,
            );
            return reply
              .status(400)
              .send({ error: error.message, code: 'AUTH_NOT_FOUND' });
          } else {
            this.logger.error(`Unexpected error during adding package`, {
              message: error instanceof Error ? error.message : 'unknown error',
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
   * Processes and normalizes asset data for a new package.
   * Converts user-provided asset amounts to the correct precision based on token decimals.
   * Handles both native ERG and custom tokens.
   *
   * @param assets - Array of asset objects with tokenId, amount, and usageDescription.
   * @returns {Promise<AssetPayload[]>}
   */
  processAssets = async (
    assets: Static<typeof UserProvidedAsset>[],
  ): Promise<AssetPayload[]> => {
    const tokens = [];
    for (let i = 0; i < assets.length; i++) {
      const { tokenId, amount: value, usageDescription } = assets[i];

      // Special case for native ERG token
      if (tokenId === 'ERG') {
        tokens.push({
          tokenId,
          amount: BigInt(Number(value) * 1e9),
          decimals: 9,
          usageDescription,
        });
        continue;
      }

      // Fetch token decimals
      const tokenDecimals = await this.nodeModel.fetchDecimalsToken(tokenId);

      // Validate the amount's precision against the token's decimals
      validateAmountPrecision(Number(value), tokenDecimals);

      // convert user provided amount to nodeAPI requested amount and save it to the list
      const amount = Number(value) * Math.pow(10, tokenDecimals);
      tokens.push({
        tokenId,
        amount: BigInt(amount),
        decimals: tokenDecimals,
        usageDescription,
      });
    }

    return tokens;
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
    this.logger.info(
      `PackageController routes registered under prefix "${prefix + this.PACKAGES_PREFIX}"`,
    );
  };
}

export { PackageController };
