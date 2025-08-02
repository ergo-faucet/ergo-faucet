import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { PackageController } from './PackageController';

class ErgoFaucetController {
  private static instance: ErgoFaucetController;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly packageController: PackageController;
  private readonly CONTROLLER_PREFIX = '/api';

  /**
   * Private constructor to enforce singleton pattern.
   * @param fastifyServer - The FastifyAPIServer instance.
   * @param packageController - The PackageController instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  private constructor(
    fastifyServer: FastifyAPIServer,
    packageController: PackageController,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ? logger : new DummyLogger();
    this.fastifyServer = fastifyServer;
    this.packageController = packageController;
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
   * @param packageController - The PackageController instance.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  public static initialize = async (
    fastifyServer: FastifyAPIServer,
    packageController: PackageController,
    logger?: AbstractLogger,
  ) => {
    if (this.instance) {
      throw new Error(
        'ErgoFaucetController instance has already been initialized.',
      );
    }
    this.instance = new ErgoFaucetController(
      fastifyServer,
      packageController,
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
    await this.fastifyServer.register(
      this.packageController.fetchPackagesRoute,
      prefix,
    );
    this.logger.info(
      `ErgoFaucetController routes registered under prefix "${prefix}"`,
    );
  };
}

export { ErgoFaucetController };
