import { DiscordAction } from '@ergo-faucet/database';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

export interface DiscordAuthConfig {
  fastifyServer: FastifyAPIServer;
  discordAction: DiscordAction;
  clientID: string;
  clientSercret: string;
  redirectURL: string;
  scope: string;
  expiresAt: Date;
}
