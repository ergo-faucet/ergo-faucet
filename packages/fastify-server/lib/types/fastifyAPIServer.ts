import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string | string[];
  swagger: FastifyDynamicSwaggerOptions;
  swaggerUi: FastifySwaggerUiOptions;
  activeFastifyLogger: boolean;
  jwtSecret: string;
}

export type FastifySeverInstance = FastifyInstance<
  // eslint-disable-next-line
  Server<any, any>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
