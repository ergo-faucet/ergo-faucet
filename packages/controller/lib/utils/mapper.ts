import {
  Asset,
  PackageAuthMethod,
  Package,
  UserAuthStatus,
} from '@ergo-faucet/database';
import { AssetDTO, AuthMethodDTO, PackageDTO } from '../types';

export const toPackageDTO = (
  packages: Package[],
  userStatuses: UserAuthStatus[],
): PackageDTO[] => {
  return packages.map((p: Package): PackageDTO => {
    const assetDTOs: AssetDTO[] = p.assets.map(
      (a: Asset): AssetDTO => ({
        id: a.id,
        tokenId: a.tokenId,
        assetName: a.assetName,
        amount: a.amount.toString(),
        usageDescription: a.usageDescription,
      }),
    );

    const authMethodDTOs: AuthMethodDTO[] = p.authMethods.map(
      (pam: PackageAuthMethod): AuthMethodDTO => {
        const status = userStatuses.find((s) => {
          const packageMatches = s.package ? s.package.id === p.id : p == null;
          return packageMatches && s.authMethod.id === pam.authMethod.id;
        });
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
      delay: p.delay.toString(),
      openAt: p.openAt?.toISOString(),
      closeAt: p.closeAt?.toISOString(),
      description: p.description,
      numberEachUser: p.numberEachUser,
      assets: assetDTOs,
      authMethods: authMethodDTOs,
    };
  });
};
