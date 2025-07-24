import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

import { PackageController } from './PackageController';

class ErgoFaucetController {
  private static instance: ErgoFaucetController;
  private readonly logger: AbstractLogger;
  private readonly fastifyServer: FastifyAPIServer;
  private readonly packageController: PackageController;

  private constructor(
    fastifyServer: FastifyAPIServer,
    packageController: PackageController,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ? logger : new DummyLogger();
    this.fastifyServer = fastifyServer;
    this.packageController = packageController;
  }

  public static getInstance = (): ErgoFaucetController => {
    if (!this.instance) {
      throw new Error(
        'ErgoFaucetController instance has not been initialized.',
      );
    }
    return ErgoFaucetController.instance;
  };

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
    this.instance.logger.info(`ErgoFaucetController initialized successfully.`);
  };

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
