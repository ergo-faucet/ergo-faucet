import { Asset, PackageAuthMethod, Package } from '@ergo-faucet/database';
import { AssetDTO, AuthMethodDTO, PackageDTO } from '../types';

export const toPackageDTO = (packages: Package[]): PackageDTO[] => {
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
      (a: PackageAuthMethod): AuthMethodDTO => ({
        id: a.authMethod.id,
        name: a.authMethod.name,
      }),
    );

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      delay: p.delay.toString(),
      openAt: p.openAt?.toString(),
      closeAt: p.closeAt?.toString(),
      description: p.description,
      numberEachUser: p.numberEachUser,
      assets: assetDTOs,
      authMethods: authMethodDTOs,
    };
  });
};
