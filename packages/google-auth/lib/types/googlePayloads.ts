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
  userId: number;
  frontState: string;
}

export interface GoogleAuthConfig {
  fastifyServer: FastifyAPIServer;
  googleAction: GoogleAction;
  frontBaseURL: string;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
  scope: string;
  expiresTime: number;
  redis: RedisOptions;
  sessionTTL: number;
}
