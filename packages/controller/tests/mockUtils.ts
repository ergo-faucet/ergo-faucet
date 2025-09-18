import {
  PackageAction,
  Package,
  Asset,
  PackageAuthMethod,
} from '@ergo-faucet/database';
import { vi } from 'vitest';
import { PackageDTO } from '../lib/types';
import { FastifyAPIServer, ServerConfig } from '@ergo-faucet/fastify-server';

/**
 * A mocked PackageAction instance with a spyable getPackages method.
 */
export const mockedPackageAction: PackageAction & {
  getPackages: ReturnType<typeof vi.fn>;
  isPackageAvailableForUser: ReturnType<typeof vi.fn>;
  hasUserPassedAllAuthMethods: ReturnType<typeof vi.fn>;
  getPassedUserAuthByPackage: ReturnType<typeof vi.fn>;
  addUserRequest: ReturnType<typeof vi.fn>;
  validateAdminRequest: ReturnType<typeof vi.fn>;
  validateAuthMethods: ReturnType<typeof vi.fn>;
  addPackage: ReturnType<typeof vi.fn>;
  getPackageById: ReturnType<typeof vi.fn>;
  addPackageAuthMethods: ReturnType<typeof vi.fn>;
  addAssets: ReturnType<typeof vi.fn>;
} = {
  getPackages: vi.fn(),
  isPackageAvailableForUser: vi.fn(),
  hasUserPassedAllAuthMethods: vi.fn(),
  getPassedUserAuthByPackage: vi.fn(),
  addUserRequest: vi.fn(),
  validateAdminRequest: vi.fn(),
  validateAuthMethods: vi.fn(),
  addPackage: vi.fn(),
  getPackageById: vi.fn(),
  addPackageAuthMethods: vi.fn(),
  addAssets: vi.fn(),
  // eslint-disable-next-line
} as any;

export const mockedFastifyServer: FastifyAPIServer & {
  authPreHandler: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  captchaPreHandler: ReturnType<typeof vi.fn>;
  setAuthCookie: ReturnType<typeof vi.fn>;
} = {
  authPreHandler: vi.fn(async (request) => {
    // Simulate JWT verification and set request.user
    request.user = {
      userId: 123,
      address: 'mocked-user-address',
      isAdmin: false,
    };
  }),

  register: vi.fn(async () => {}),
  captchaPreHandler: vi.fn(async () => {
    return;
  }),
  setAuthCookie: vi.fn(),
  // eslint-disable-next-line
} as any;

export const mockNodeModel = {
  getCurrentBlockchainHeight: vi.fn(),
  getTokenById: vi.fn(),
  submitTransactionBytes: vi.fn(),
  isTxInMempool: vi.fn(),
  getInclusionHeight: vi.fn(),
  fetchDecimalsToken: vi.fn(),
  // eslint-disable-next-line
} as any;

let mockPackage = {} as Package;

const mockAsset1: Asset = {
  id: 1,
  package: mockPackage,
  tokenId: 'token-abc-123',
  decimals: 1,
  assetName: 'token-abc-123',
  amount: '1000',
  usageDescription: 'Initial reward',
};

const mockAsset2: Asset = {
  id: 2,
  package: mockPackage,
  tokenId: 'token-def-456',
  decimals: 1,
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
  delay: 3600n,
  numberEachUser: 1,
  assets: [mockAsset1, mockAsset2],
  authMethods: [mockAuthMethod1, mockAuthMethod2],
  authStatuses: [],
  requests: [],
};

export const mockPackageDTO: PackageDTO[] = [
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
        tokenId: 'token-abc-123',
        assetName: 'token-abc-123',
        amount: '1000',
        decimals: 1,
        usageDescription: 'Initial reward',
      },
      {
        tokenId: 'token-def-456',
        assetName: 'token-def-456',
        amount: '500',
        decimals: 1,
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

export const mockConfig: ServerConfig = {
  port: 3000,
  host: 'localhost',
  corsOrigins: '*',
  jwtSecret: 'test_secret',
  jwtExpiration: 300,
  // eslint-disable-next-line
  googleRecaptcha: {} as any,
  swagger: {
    exposeHeadRoutes: true,
    openapi: {
      info: {
        title: 'Test API',
        description: 'API Documentation',
        version: '1.0.0',
      },
    },
  },
  swaggerUi: {
    routePrefix: '/docs',
  },
  activeFastifyLogger: false,
  cookie: {
    secret: 'test_cookie_secret',
    name: 'auth_token',
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600,
    domain: 'localhost',
    signed: false,
  },
};

export { mockPackage };
