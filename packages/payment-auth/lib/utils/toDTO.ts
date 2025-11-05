import { UserAuthStatus } from '@ergo-faucet/database';

export const toDTO = (authStatus: UserAuthStatus, expiresTime: number) => {
  return {
    id: authStatus.id,
    verifiedAt: authStatus.verifiedAt,
    createdAt: authStatus.createdAt,
    modifiedAt: authStatus.modifiedAt,
    status: authStatus.status,
    config: JSON.stringify(authStatus.authMethod.config),
    address: authStatus.metadata.address,
    expiresTime,
  };
};
