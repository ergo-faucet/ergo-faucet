import {
  Asset,
  PackageAuthMethod,
  Package,
  UserRequest,
} from '@ergo-faucet/database';
import { AssetDTO, AuthMethodDTO, PackageDTO, RequestDTO } from '../types';

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
      openAt: p.openAt?.toISOString(),
      closeAt: p.closeAt?.toISOString(),
      description: p.description,
      numberEachUser: p.numberEachUser,
      assets: assetDTOs,
      authMethods: authMethodDTOs,
    };
  });
};

export const toRequestDTO = (requests: UserRequest[]): RequestDTO[] => {
  return requests.map(
    (r: UserRequest): RequestDTO => ({
      packageId: r.package.id,
      packageName: r.package.name,
      status: r.status,
      timestamp: r.timestamp.toISOString(),
      destinationAddress: r.destinationAddress,
      txId: r.txId || undefined,
    }),
  );
};
