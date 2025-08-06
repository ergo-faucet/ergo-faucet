import { RedisOptions } from 'ioredis';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { XAction } from '@ergo-faucet/database';

export interface XToken {
  accessToken: string;
  refreshToken: string;
  expiresInSecond: number;
}

export interface XUserData {
  userId: string;
  username: string;
  name: string;
  join_date: Date;
}

export interface SessionData {
  codeVerifier: string;
}

export interface XAuthConfig {
  fastifyServer: FastifyAPIServer;
  xAction: XAction;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
  scope: string;
  expiresAt: Date;
  redis: RedisOptions;
  sessionTTL: number;
}
