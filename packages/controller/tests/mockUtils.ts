import {
  PackageAction,
  Package,
  Asset,
  PackageAuthMethod,
} from '@ergo-faucet/database';
import fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { vi } from 'vitest';
import { FastifyAPIServer } from '@ergo-faucet/fastify-server';

/**
 * Factory function to create a new Fastify instance for testing.
 */
export const createMockedServer = (): FastifyInstance => {
  return fastify();
};

/**
 * A mocked PackageAction instance with a spyable getPackages method.
 */
export const mockedPackageAction: PackageAction & {
  getPackages: ReturnType<typeof vi.fn>;
  isPackageAvailableForUser: ReturnType<typeof vi.fn>;
  hasUserPassedAllAuthMethods: ReturnType<typeof vi.fn>;
  getPassedUserAuthByPackage: ReturnType<typeof vi.fn>;
  addUserRequest: ReturnType<typeof vi.fn>;
} = {
  getPackages: vi.fn(),
  isPackageAvailableForUser: vi.fn(),
  hasUserPassedAllAuthMethods: vi.fn(),
  getPassedUserAuthByPackage: vi.fn(),
  addUserRequest: vi.fn(),
  // eslint-disable-next-line
} as any;

export const mockedFastifyServer: FastifyAPIServer & {
  authPreHandler: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  captchaPreHandler: ReturnType<typeof vi.fn>;
  setAuthCookie: ReturnType<typeof vi.fn>;
} = {
  authPreHandler: vi.fn((verifyAndEnforce: boolean = true) => {
    return async (request: FastifyRequest) => {
      if (!verifyAndEnforce) return;
      else {
        // Simulate JWT verification and set request.user
        request.user = {
          userId: 123,
          address: 'mocked-user-address',
        };
      }
    };
  }),

  register: vi.fn(async () => {}),
  captchaPreHandler: vi.fn(async () => {}),
  setAuthCookie: vi.fn(),
  // eslint-disable-next-line
} as any;

let mockPackage = {} as Package;

const mockAsset1: Asset = {
  id: 1,
  package: mockPackage,
  tokenId: 'token-abc-123',
  assetName: 'token-abc-123',
  amount: '1000',
  usageDescription: 'Initial reward',
};

const mockAsset2: Asset = {
  id: 2,
  package: mockPackage,
  tokenId: 'token-def-456',
  assetName: 'token-def-456',
  amount: '500',
  usageDescription: 'Bonus item',
};

const mockAuthMethod1: PackageAuthMethod = {
  id: 1,
  authMethod: {
    id: 1,
    name: 'Telegram',
    config: '{"botToken": "123456:ABC-DEF"}',
    packageAuthMethods: [],
    userAuthStatuses: [],
  },
  order: 1,
  package: mockPackage,
};

const mockAuthMethod2: PackageAuthMethod = {
  id: 2,
  authMethod: {
    id: 2,
    name: 'Email',
    config: '{"smtpServer": "smtp.example.com"}',
    packageAuthMethods: [],
    userAuthStatuses: [],
  },
  order: 2,
  package: mockPackage,
};

mockPackage = {
  id: 101,
  name: 'Starter Pack',
  description: 'A package for new users',
  type: 'normal',
  status: 'show',
  //openAt: new Date('2025-07-01'),
  closeAt: new Date('2025-12-31'),
  delay: '3600',
  numberEachUser: 1,
  assets: [mockAsset1, mockAsset2],
  authMethods: [mockAuthMethod1, mockAuthMethod2],
  authStatuses: [],
  requests: [],
};

export const mockPackageDTO = [
  {
    id: 101,
    name: 'Starter Pack',
    type: 'normal',
    delay: '3600',
    //openAt: new Date('2025-07-01').toISOString(),
    closeAt: new Date('2025-12-31').toISOString(),
    description: 'A package for new users',
    numberEachUser: 1,
    assets: [
      {
        id: 1,
        tokenId: 'token-abc-123',
        assetName: 'token-abc-123',
        amount: '1000',
        usageDescription: 'Initial reward',
      },
      {
        id: 2,
        tokenId: 'token-def-456',
        assetName: 'token-def-456',
        amount: '500',
        usageDescription: 'Bonus item',
      },
    ],
    authMethods: [
      {
        id: 1,
        name: 'Telegram',
      },
      {
        id: 2,
        name: 'Email',
      },
    ],
  },
];

export { mockPackage };
