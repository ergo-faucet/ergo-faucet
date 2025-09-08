import { Asset } from '../entities';

export interface PackagePayload {
  assets: AssetPayload[];
  openAt?: string | undefined;
  closeAt?: string | undefined;
  name: string;
  description: string;
  type: 'normal' | 'random';
  status: 'show' | 'hide';
  delay: number;
  numberEachUser: number;
  authMethods: { id: number; order?: number }[];
}

export type AssetPayload = Omit<Asset, 'id' | 'package'>;
