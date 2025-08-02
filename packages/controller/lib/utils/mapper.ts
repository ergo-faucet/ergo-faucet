import { Asset, PackageAuthMethod } from '@ergo-faucet/database';
import { Package } from '@ergo-faucet/database';
import { AssetDto, AuthMethodDto, PackageDto } from '../types/Dtos';

export const toPackageDto = (packages: Package[]): PackageDto[] => {
  const packageDtos: PackageDto[] = [];

  packages.forEach((p: Package) => {
    const assetDtos: AssetDto[] = [];

    p.assets.forEach((a: Asset) => {
      const assetDto: AssetDto = {
        id: a.id,
        tokenId: a.tokenId,
        amount: a.amount.toString(),
        usageDescription: a.usageDescription,
      };
      assetDtos.push(assetDto);
    });

    const authMethodDtos: AuthMethodDto[] = [];

    p.authMethods.forEach((a: PackageAuthMethod) => {
      const authMethodDto: AuthMethodDto = {
        id: a.authMethod.id,
        name: a.authMethod.name,
      };
      authMethodDtos.push(authMethodDto);
    });

    const packageDto: PackageDto = {
      id: p.id,
      name: p.name,
      type: p.type,
      delay: p.delay,
      openAt: p.openAt?.toString(),
      closeAt: p.closeAt?.toString(),
      description: p.description,
      numberEachUser: p.numberEachUser,
      assets: assetDtos,
      authMethods: authMethodDtos,
    };

    packageDtos.push(packageDto);
  });

  return packageDtos;
};
