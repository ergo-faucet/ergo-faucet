import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string | string[];
  swagger: FastifyDynamicSwaggerOptions;
  swaggerUi: FastifySwaggerUiOptions;
  activeFastifyLogger: boolean;
  jwtSecret: string;
  jwtExpiration: number;
  cookie: CookieConfig;
}

export type FastifySeverInstance = FastifyInstance<
  Server<typeof IncomingMessage, typeof ServerResponse>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
> &
  Partial<typeof fastifyJwt> &
  Partial<typeof fastifyCookie>;

export interface CookieConfig {
  signed: boolean;
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  domain?: string;
  maxAge?: number;
}
