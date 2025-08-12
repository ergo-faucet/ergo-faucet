import { DiscordAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

export interface DiscordAuthConfig {
  fastifyServer: FastifyAPIServer;
  discordAction: DiscordAction;
  clientID: string;
  clientSecret: string;
  redirectURL: string;
  scope: string;
  expiresTime: number;
}
