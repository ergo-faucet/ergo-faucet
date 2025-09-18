export type PackageType = 'normal' | 'random';
export type AuthMethodStatus =
  | 'passed'
  | 'failed'
  | 'pending'
  | 'expired'
  | undefined;

export interface AssetDTO {
  id: number;
  tokenId: string;
  assetName: string;
  amount: string;
  usageDescription: string;
}

export interface AuthMethodDTO {
  id: number;
  name: string;
  status?: AuthMethodStatus;
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
