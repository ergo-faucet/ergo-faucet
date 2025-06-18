import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

export interface ServerConfig {
  port: number;
  host: string;
  logger: AbstractLogger;
  corsOrigins: string | string[];
  swagger: FastifyDynamicSwaggerOptions;
  swaggerUi: FastifySwaggerUiOptions;
}

export type RouteRegistrationCallback = (
  fastify: FastifyInstance,
) => Promise<void> | void;

export interface Route {
  url: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'; // Add other HTTP methods as needed
  handler: RouteHandlerMethod;
}
