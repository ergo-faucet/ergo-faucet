import { vi } from 'vitest';
import { ServerConfig } from '@ergo-faucet/fastify-server';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  // eslint-disable-next-line
} as any;

const mockPaymentAction = {
  getUnpaidRecords: vi.fn(),
  getAndIncrementCounter: vi.fn(),
  passUserPayment: vi.fn(),
  updateUserPaymentAuthStatus: vi.fn(),
  addUserPaymentAuthStatus: vi.fn(),
  getUserPaymentAuthStatus: vi.fn(),
  // eslint-disable-next-line
} as any;

const mockNodeModel = {
  getCurrentBlockchainHeight: vi.fn(),
  submitTransactionBytes: vi.fn(),
  isTxInMempool: vi.fn(),
  getInclusionHeight: vi.fn(),
  checkForPayment: vi.fn(),
  // eslint-disable-next-line
} as any;

const mockWallet = {
  selectBoxes: vi.fn(),
  signTransaction: vi.fn(),
  generateUniquePaymentAddress: vi.fn(),
  getWalletAddress: vi
    .fn()
    .mockReturnValue('9iBotAU1mvrbuFsyEMokLqeWp45t6G38WK4SurzquGtjieGohMk'),
  // eslint-disable-next-line
} as any;

const mockConfig = {
  expiresTime: 60,
  expiresTimeDelay: 30,
  nodeModel: mockNodeModel,
  paymentAction: mockPaymentAction,
  wallet: mockWallet,
};

export const mockFastifyConfig: ServerConfig = {
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

export { mockNodeModel, mockWallet, mockLogger, mockPaymentAction, mockConfig };
