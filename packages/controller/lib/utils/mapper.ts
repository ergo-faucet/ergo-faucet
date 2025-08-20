import {
  Asset,
  PackageAuthMethod,
  UserAuthStatus,
  Package,
} from '@ergo-faucet/database';
import { AssetDTO, AuthMethodDTO, PackageDTO } from '../types';

export const toPackageDTO = (
  packages: Package[],
  userStatuses?: UserAuthStatus[],
): PackageDTO[] => {
  return packages.map((p: Package): PackageDTO => {
    // Map assets
    const assetDTOs: AssetDTO[] = p.assets.map(
      (a: Asset): AssetDTO => ({
        id: a.id,
        tokenId: a.tokenId,
        amount: a.amount.toString(),
        usageDescription: a.usageDescription,
      }),
    );

    // Map auth methods
    const authMethodDTOs: AuthMethodDTO[] = p.authMethods.map(
      (pam: PackageAuthMethod): AuthMethodDTO => {
        // Find matching user status
        const status = userStatuses?.find(
          (s) =>
            s.package?.id === p.id && s.authMethod.id === pam.authMethod.id,
        );
        return {
          id: pam.authMethod.id,
          name: pam.authMethod.name,
          status: status?.status,
        };
      },
    );

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      delay: p.delay,
      openAt: p.openAt?.toString(),
      closeAt: p.closeAt?.toString(),
      description: p.description,
      numberEachUser: p.numberEachUser,
      assets: assetDTOs,
      authMethods: authMethodDTOs,
    };
  });
};
