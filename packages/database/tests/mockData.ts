import { PackageDTO } from '../lib/types';

export const mockPackages: PackageDTO[] = [
  {
    id: 3,
    name: 'Package 3',
    description: 'desc 3',
    type: 'normal',
    openAt: undefined,
    closeAt: undefined,
    delay: '0',
    numberEachUser: 0,
    assets: [
      {
        id: 4,
        tokenId: 'token-ghi-1',
        assetName: 'Asset 4',
        amount: '300',
        decimals: 0,
        usageDescription: 'usage for package 3',
      },
    ],
    authMethods: [
      {
        id: 1,
        name: 'discord',
        status: 'expired',
      },
      {
        id: 2,
        name: 'x-platform',
        status: 'expired',
      },
    ],
  },
  {
    id: 2,
    name: 'Package 2',
    description: 'desc 2',
    type: 'normal',
    openAt: undefined,
    closeAt: undefined,
    delay: '0',
    numberEachUser: 0,
    assets: [
      {
        id: 3,
        tokenId: 'token-def-1',
        assetName: 'Asset 3',
        amount: '200',
        decimals: 0,
        usageDescription: 'usage for package 2',
      },
    ],
    authMethods: [
      {
        id: 1,
        name: 'discord',
      },
      {
        id: 3,
        name: 'google',
        status: 'expired',
      },
    ],
  },
  {
    id: 1,
    name: 'Package 1',
    description: 'desc 1',
    type: 'normal',
    openAt: undefined,
    closeAt: undefined,
    delay: '0',
    numberEachUser: 0,
    assets: [
      {
        id: 1,
        tokenId: 'token-abc-1',
        assetName: 'Asset 1',
        amount: '1000',
        decimals: 0,
        usageDescription: 'usage for package 1',
      },
      {
        id: 2,
        tokenId: 'token-abc-2',
        assetName: 'Asset 2',
        amount: '500',
        decimals: 0,
        usageDescription: 'extra usage for package 1',
      },
    ],
    authMethods: [
      {
        id: 1,
        name: 'discord',
      },
    ],
  },
];
