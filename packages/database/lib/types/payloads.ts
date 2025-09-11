import { Asset } from '../entities';

export interface PackagePayload {
  openAt?: string | undefined;
  closeAt?: string | undefined;
  name: string;
  description: string;
  type: 'normal' | 'random';
  status: 'show' | 'hide';
  delay: string;
  numberEachUser: number;
}

export type AssetPayload = Omit<Asset, 'id' | 'package'>;
