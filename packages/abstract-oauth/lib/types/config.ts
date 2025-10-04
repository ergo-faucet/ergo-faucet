import { DiscordAction, GoogleAction, XAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { RedisOptions } from 'ioredis';

export interface AuthConfig {
  fastifyServer: FastifyAPIServer;
  action: XAction | GoogleAction | DiscordAction;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
  scope: string;
  expiresTime: number;
  redis: RedisOptions;
  sessionTTL: number;
  frontBaseURL: string;
}
