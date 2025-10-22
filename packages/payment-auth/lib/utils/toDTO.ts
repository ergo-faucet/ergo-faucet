import { UserAuthStatus } from '@ergo-faucet/database';

export const toDTO = (authStatus: UserAuthStatus) => {
  return {
    id: authStatus.id,
    verifiedAt: authStatus.verifiedAt,
    status: authStatus.status,
    config: authStatus.authMethod.config,
    address: authStatus.metadata.address,
  };
};
