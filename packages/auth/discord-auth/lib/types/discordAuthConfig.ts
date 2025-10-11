import { DiscordAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { RedisOptions } from 'ioredis';

export interface DiscordAuthConfig {
  fastifyServer: FastifyAPIServer;
  action: DiscordAction;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
  scope: string;
  expiresTime: number;
  redis: RedisOptions;
  sessionTTL: number;
  frontBaseURL: string;
}
