import { PackageAction } from '@ergo-faucet/database';
import { NodeModel } from '@ergo-faucet/ergo-utils';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { Network } from '@fleet-sdk/common';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';

export interface PackageControllerConfig {
  packageAction: PackageAction;
  fastifyServer: FastifyAPIServer;
  nodeModel: NodeModel;
  networkType: Network;
  logger?: AbstractLogger;
}
