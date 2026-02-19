import { XAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { RedisOptions } from 'ioredis';

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
  userId: number;
  frontState: string;
}

export interface XAuthConfig {
  fastifyServer: FastifyAPIServer;
  xAction: XAction;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
  scope: string;
  expiresTime: number;
  redis: RedisOptions;
  sessionTTL: number;
  frontBaseURL: string;
}
