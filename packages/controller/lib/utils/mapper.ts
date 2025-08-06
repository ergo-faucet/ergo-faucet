import { Asset, PackageAuthMethod } from '@ergo-faucet/database';
import { Package } from '@ergo-faucet/database';
import { AssetDTO, AuthMethodDTO, PackageDTO } from '../types/DTOs';

export const toPackageDTO = (packages: Package[]): PackageDTO[] => {
  return packages.map((p: Package): PackageDTO => {
    const assetDTOs: AssetDTO[] = p.assets.map(
      (a: Asset): AssetDTO => ({
        id: a.id,
        tokenId: a.tokenId,
        amount: a.amount.toString(),
        usageDescription: a.usageDescription,
      }),
    );

    const authMethodDTOs: AuthMethodDTO[] = p.authMethods.map(
      (a: PackageAuthMethod): AuthMethodDTO => ({
        id: a.authMethod.id,
        name: a.authMethod.name,
      }),
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
