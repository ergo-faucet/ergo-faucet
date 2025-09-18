import {
  Asset,
  PackageAuthMethod,
  Package,
  AssetDTO,
  AuthMethodDTO,
  PackageDTO,
} from '@ergo-faucet/database';

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

    const authMethodDTOs: AuthMethodDTO[] = p.packageAuthMethods.map(
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
      openAt: p.openAt,
      closeAt: p.closeAt,
      description: p.description,
      numberEachUser: p.numberEachUser,
      assets: assetDTOs,
      authMethods: authMethodDTOs,
    };
  });
};
