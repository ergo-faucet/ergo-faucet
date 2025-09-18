import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { PackageController } from './PackageController';
import { PackageAction } from '@ergo-faucet/database';
import { Network } from '@fleet-sdk/common';
import { NodeModel } from '@ergo-faucet/ergo-utils';

class ErgoFaucetController {
  private static instance: ErgoFaucetController;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly packageController: PackageController;
  private readonly CONTROLLER_PREFIX = '/controller';

  /**
   * Private constructor to enforce singleton pattern.
   * @param fastifyServer - The FastifyAPIServer instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  private constructor(
    fastifyServer: FastifyAPIServer,
    private readonly packageAction: PackageAction,
    private readonly NETWORK_TYPE: Network,
    private readonly nodeModel: NodeModel,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ? logger : new DummyLogger();
    this.fastifyServer = fastifyServer;
    this.packageController = new PackageController({
      packageAction: this.packageAction,
      fastifyServer: this.fastifyServer,
      networkType: this.NETWORK_TYPE,
      nodeModel: this.nodeModel,
      logger,
    });
  }

  /**
   * Returns the singleton instance of ErgoFaucetController.
   * Throws an error if not yet initialized.
   * @returns {ErgoFaucetController} The singleton instance.
   */
  public static getInstance = (): ErgoFaucetController => {
    if (!this.instance) {
      throw new Error(
        'ErgoFaucetController instance has not been initialized.',
      );
    }
    return ErgoFaucetController.instance;
  };

  /**
   * Initializes the ErgoFaucetController singleton with the given Fastify server,
   * PackageController, and optional logger. Throws an error if already initialized.
   * @param fastifyServer - The FastifyAPIServer instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  public static initialize = async (
    fastifyServer: FastifyAPIServer,
    packageAction: PackageAction,
    networkType: Network,
    nodeModel: NodeModel,
    logger?: AbstractLogger,
  ) => {
    if (this.instance) {
      throw new Error(
        'ErgoFaucetController instance has already been initialized.',
      );
    }
    this.instance = new ErgoFaucetController(
      fastifyServer,
      packageAction,
      networkType,
      nodeModel,
      logger,
    );
    await this.instance.registerRoutes(this.instance.CONTROLLER_PREFIX);
    this.instance.logger.info(`ErgoFaucetController initialized successfully.`);
  };

  /**
   * Registers all API routes for the Ergo Faucet application under the specified prefix.
   * Delegates route registration to the PackageController.
   * @param prefix - The URL prefix under which to register the routes.
   * @returns {Promise<void>}
   */
  public registerRoutes = async (prefix: string): Promise<void> => {
    await this.packageController.registerRoutes(prefix);
    this.logger.info(
      `ErgoFaucetController routes registered under prefix "${prefix}"`,
    );
  };
}

export { ErgoFaucetController };
