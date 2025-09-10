export type PackageType = 'normal' | 'random';

export interface AssetDTO {
  tokenId: string;
  assetName: string;
  amount: string;
  decimals: number;
  usageDescription: string;
}

export interface AuthMethodDTO {
  id: number;
  name: string;
}

export interface PackageDTO {
  id: number;
  name: string;
  description: string;
  type: PackageType;
  openAt?: string;
  closeAt?: string;
  delay: string;
  numberEachUser: number;
  assets: AssetDTO[];
  authMethods: AuthMethodDTO[];
}
