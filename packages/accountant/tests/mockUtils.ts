import {
  AccountantAction,
  Package,
  User,
  UserRequest,
} from '@ergo-faucet/database';
import { Network } from '@fleet-sdk/common';
import { vi } from 'vitest';
import { AccountantConfig } from '../lib';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  // eslint-disable-next-line
} as any;

const mockAccountantAction = {
  getUnpaidRequests: vi.fn(),
  updateUserRequestPaymentInfo: vi.fn(),
  // eslint-disable-next-line
} as any;

const mockNodeModel = {
  getCurrentBlockchainHeight: vi.fn(),
  submitTransaction: vi.fn(),
  submitTransactionBytes: vi.fn(),
  isTxInMempool: vi.fn(),
  isTxMined: vi.fn(),
  // eslint-disable-next-line
} as any;

const mockWallet = {
  selectBoxes: vi.fn(),
  signTransaction: vi.fn(),
  getWalletAddress: vi
    .fn()
    .mockReturnValue('9iBotAU1mvrbuFsyEMokLqeWp45t6G38WK4SurzquGtjieGohMk'),
  // eslint-disable-next-line
} as any;

export const mockedConfig: AccountantConfig = {
  nodeModel: mockNodeModel,
  wallet: mockWallet,
  network: Network.Mainnet,
  tryLimit: 3,
  accountantAction: {} as AccountantAction,
  minFee: 1000000n,
  minNanoErg: 1000000n,
  confirmationLimit: 10,
};

export const mockUserRequest: UserRequest = {
  id: 1,
  user: {} as User,
  package: {
    id: 1,
    name: 'Test Package',
    assets: [{ tokenId: 'token1', amount: 100n }],
  } as Package,
  timestamp: new Date(),
  destinationAddress: '3WxFE2x4KVDYeQyJhKvK912AHHME6wNLBT8p6w7M1KqMp71jCAWc',
  status: 'pending',
  txSerialized: null,
  txId: null,
  creationHeight: 100,
  numberOfTries: 0,
};

export { mockNodeModel, mockWallet, mockAccountantAction, mockLogger };
