export const requestPackagePayload = {
  packageId: 1,
  destAddress: 'test-address',
  captchaToken: 'token',
};

export const mockAssets = [
  { tokenId: 'ERG', amount: '1', usageDescription: 'Test ERG' },
  { tokenId: 'TOKEN1', amount: '1.0', usageDescription: 'Test token' },
];

export const mockProccessedAssets = [
  {
    tokenId: 'ERG',
    assetName: 'ERG',
    amount: '1000000000',
    decimals: 9,
    usageDescription: 'Test ERG',
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    modifiedAt: new Date('2024-01-15T10:00:00.000Z'),
  },
  {
    tokenId: 'TOKEN1',
    assetName: 'TOKEN1',
    amount: '10000',
    decimals: 2,
    usageDescription: 'Test token',
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    modifiedAt: new Date('2024-01-15T10:00:00.000Z'),
  },
];
