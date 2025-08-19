import { DiscordAction, GoogleAction, XAction } from '@ergo-faucet/database';

export interface AuthJobType {
  discordAction: DiscordAction;
  googleAction: GoogleAction;
  xAction: XAction;
  jobInterval: number;
}
