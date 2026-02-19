import { UserAddressAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { Network } from '@fleet-sdk/core';
import { RedisOptions } from 'ioredis';

export interface ErgoAuthConfig {
  redisConfig: RedisOptions;
  fastifyServer: FastifyAPIServer;
  userAddressAction: UserAddressAction;
  challengeExpirySeconds: number;
  refreshTokenExpirySeconds: number;
  accessTokenExpirySeconds: number;
  networkType: Network;
}
