import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { PackageAction, RequestHistoryAction } from '@ergo-faucet/database';
import { Network } from '@fleet-sdk/common';
import { RequestHistoryController, PackageController } from './';

class ErgoFaucetController {
  private static instance: ErgoFaucetController;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly packageController: PackageController;
  private readonly requestHistoryController: RequestHistoryController;
  private readonly CONTROLLER_PREFIX = '/controller';

  /**
   * Private constructor to enforce singleton pattern.
   * @param fastifyServer - The FastifyAPIServer instance.
   * @param packageAction - Instance of PackageAction for DB operations.
   * @param networkType - The network type (e.g., mainnet, testnet).
   * @param requsetHistoryAction - Instance of RequestHistoryAction for DB operations.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  private constructor(
    fastifyServer: FastifyAPIServer,
    private readonly packageAction: PackageAction,
    private readonly NETWORK_TYPE: Network,
    private readonly requsetHistoryAction: RequestHistoryAction,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ? logger : new DummyLogger();
    this.fastifyServer = fastifyServer;
    this.packageController = new PackageController(
      this.packageAction,
      this.fastifyServer,
      this.NETWORK_TYPE,
      logger,
    );
    this.requestHistoryController = new RequestHistoryController(
      this.requsetHistoryAction,
      this.fastifyServer,
      logger,
    );
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
   * @param packageAction - Instance of PackageAction for DB operations.
   * @param networkType - The network type (e.g., mainnet, testnet).
   * @param requsetHistoryAction - Instance of RequestHistoryAction for DB operations.
   * @param logger - Optional logger implementing AbstractLogger.
   */
  public static initialize = async (
    fastifyServer: FastifyAPIServer,
    packageAction: PackageAction,
    networkType: Network,
    requsetHistoryAction: RequestHistoryAction,
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
      requsetHistoryAction,
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
    await this.requestHistoryController.registerRoutes(prefix);
    this.logger.info(
      `ErgoFaucetController routes registered under prefix "${prefix}"`,
    );
  };
}

export { ErgoFaucetController };
