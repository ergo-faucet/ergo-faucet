import { DiscordAction, GoogleAction, XAction } from '@ergo-faucet/database';
import { AuthJob } from '../jobs';
import { authJobConfig } from '../configs';
import { AuthJobType } from '../types';

export const startAuthJob = async () => {
  const jobConfig: AuthJobType = {
    discordAction: DiscordAction.getInstance(),
    googleAction: GoogleAction.getInstance(),
    xAction: XAction.getInstance(),
    jobInterval: authJobConfig.jobInterval * 1000, // convert to ms
  };

  AuthJob.initialize(jobConfig);
  const authJob = AuthJob.getInstance();
  await authJob.scheduleJob();
};
