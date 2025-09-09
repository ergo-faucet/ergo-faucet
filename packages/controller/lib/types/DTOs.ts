export type PackageType = 'normal' | 'random';

export interface AssetDTO {
  id: number;
  tokenId: string;
  amount: string;
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
  delay: number;
  numberEachUser: number;
  assets: AssetDTO[];
  authMethods: AuthMethodDTO[];
}

export interface RequestDTO {
  packageId: number;
  packageName: string;
  status: 'paid' | 'failed' | 'pending' | 'submitted';
  timestamp: string;
  destinationAddress: string;
  txId?: string;
}
