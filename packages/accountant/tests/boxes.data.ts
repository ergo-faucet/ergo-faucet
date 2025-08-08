import { Box } from '@fleet-sdk/common';
import { mockUTxO } from '@fleet-sdk/mock-chain';
import { ErgoHDKey, generateMnemonic } from '@fleet-sdk/wallet';

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

export const mockRootKey = await ErgoHDKey.fromMnemonic(generateMnemonic());
// mock inputs
export const mockInput = mockUTxO({
  value: 1_000_000_000n,
  ergoTree: mockRootKey.address.ergoTree,
  assets: [
    {
      amount: 100n,
      tokenId:
        '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04',
    },
  ],
});
