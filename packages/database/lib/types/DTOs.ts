export type PackageType = 'normal' | 'random';
export type AuthMethodStatus = 'passed' | 'failed' | 'pending' | 'expired';
export type RequestStatus = 'paid' | 'failed' | 'pending' | 'submitted';

export interface AssetDTO {
  id: number;
  tokenId: string;
  assetName: string;
  amount: string;
  decimals: number;
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
  openAt?: number;
  closeAt?: number;
  delay: string;
  numberEachUser: number;
  assets: AssetDTO[];
  authMethods: AuthMethodDTO[];
  totalRequestCount?: number;
  lastRequestTime?: number;
  lastRequestStatus?: 'paid' | 'failed' | 'pending' | 'submitted';
}

export interface RequestDTO {
  requestId: number;
  packageId: number;
  packageName: string;
  status: RequestStatus;
  createdAt: number;
  destinationAddress: string;
  txId?: string;
}

export interface RequestList {
  total: number;
  requests: RequestDTO[];
}

export interface PackageList {
  total: number;
  packages: PackageDTO[];
}
