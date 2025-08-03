import { RedisOptions } from 'ioredis';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { UserAddressAction } from '@ergo-faucet/database';
import { Network } from '@fleet-sdk/core';

export interface ErgoAuthConfig {
  redisConfig: RedisOptions;
  fastifyServer: FastifyAPIServer;
  userAddressAction: UserAddressAction;
  challengeExpirySeconds: number;
  refreshTokenExpirySeconds: number;
  accessTokenExpirySeconds: number;
  networkAddress: Network;
}
