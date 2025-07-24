export type PackageType = 'normal' | 'random';

export interface AssetDto {
  id: number;
  tokenId: string;
  amount: string;
  usageDescription: string;
}

export interface AuthMethodDto {
  id: number;
  name: string;
}

export interface PackageDto {
  id: number;
  name: string;
  description: string;
  type: PackageType;
  openAt?: string;
  closeAt?: string;
  delay: number;
  numberEachUser: number;
  assets: AssetDto[];
  authMethods: AuthMethodDto[];
}
