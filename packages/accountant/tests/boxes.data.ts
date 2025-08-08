import { Box } from '@fleet-sdk/common';

export const mockBoxes: Box<bigint>[] = [
  {
    ergoTree: '0008cd03...',
    creationHeight: 123456,
    value: 1000000n,
    assets: [
      { tokenId: 'token1', amount: 100n },
      { tokenId: 'token2', amount: 200n },
    ],
    additionalRegisters: {},
    boxId: 'boxId1',
    transactionId: 'txId1',
    index: 0,
  },
  {
    ergoTree: '0008cd03...',
    creationHeight: 123457,
    value: 2000000n,
    assets: [
      { tokenId: 'token1', amount: 300n },
      { tokenId: 'token2', amount: 400n },
    ],
    additionalRegisters: {},
    boxId: 'boxId2',
    transactionId: 'txId2',
    index: 1,
  },
];
