import { Asset } from '../entities';

export interface PackagePayload {
  openAt?: number;
  closeAt?: number;
  name: string;
  description: string;
  type: 'normal' | 'random';
  status: 'show' | 'hide';
  delay: string;
  numberEachUser: number;
  maxPayout?: number;
}

export type AssetPayload = Omit<
  Asset,
  'id' | 'package' | 'createdAt' | 'modifiedAt'
>;

export type AuthMethodPayload = { id: number; order?: number };
