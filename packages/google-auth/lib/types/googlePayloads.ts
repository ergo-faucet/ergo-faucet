import { RedisOptions } from 'ioredis';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';
import { GoogleAction } from '@ergo-faucet/database';

export interface GoogleToken {
  accessToken: string;
  refreshToken: string;
  expiresInSecond: number;
}

export interface GoogleUserData {
  userId: string;
  email: string;
  name: string;
}

export interface SessionData {
  codeVerifier: string;
}

export interface GoogleAuthConfig {
  fastifyServer: FastifyAPIServer;
  googleAction: GoogleAction;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
  scope: string;
  expiresTime: number;
  redis: RedisOptions;
  sessionTTL: number;
}
