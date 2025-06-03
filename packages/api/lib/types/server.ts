import { FastifyInstance } from 'fastify';
import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

export interface ServerConfig {
  port: number;
  host: string;
  logger: AbstractLogger;
  corsOrigins: string | string[];
  swagger?: FastifyDynamicSwaggerOptions;
}

export type RouteRegistrationCallback = (
  fastify: FastifyInstance,
  config: ServerConfig
) => Promise<void> | void;

export interface APIServer {
  registerRoutes: (callback: RouteRegistrationCallback) => void;
  start: () => Promise<void>;
}