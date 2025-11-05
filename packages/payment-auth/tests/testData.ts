import { AuthMethod, User, UserAuthStatus } from '@ergo-faucet/database';
import { mockConfig } from './mockUtils';

export const getAddressPayload = { packageId: 2, authMethodId: 4 };

export const mockNewStatus = {
  id: 10,
  status: 'pending',
  createdAt: 1762344032,
  modifiedAt: 1762344032,
  authMethod: { config: {} } as AuthMethod,
  metadata: { address: 'newaddress' },
  user: { id: 1 } as User,
} as UserAuthStatus;

export const mockFailedStatus = {
  id: 11,
  status: 'failed',
  createdAt: 1762344000,
  modifiedAt: 1762344000,
  authMethod: { config: {} } as AuthMethod,
  metadata: { address: 'oldaddress' },
} as UserAuthStatus;

export const mockExpiredStatus = {
  id: 11,
  status: 'expired',
  createdAt: 1762344000,
  modifiedAt: 1762344000,
  authMethod: { config: {} } as AuthMethod,
  metadata: { address: 'oldaddress' },
} as UserAuthStatus;

export const mockPassedStatus = {
  id: 11,
  status: 'passed',
  createdAt: 1762344000,
  modifiedAt: 1762344000,
  verifiedAt: 1762344100,
  authMethod: { config: { payment: {} } } as AuthMethod,
  metadata: { address: 'paidaddress' },
} as UserAuthStatus;

export const mockPendingStatus = {
  id: 11,
  status: 'pending',
  createdAt: 1762344032 - 30, // within 60s limit
  modifiedAt: 1762344032,
  authMethod: { config: { payment: {} } } as AuthMethod,
  metadata: { address: 'pendingaddress' },
} as UserAuthStatus;

export const mockExpiredPendingStatus = {
  id: 11,
  status: 'pending',
  createdAt: 1762344032 - 70, // > 60s expired
  modifiedAt: 1762344032,
  authMethod: { config: {} } as AuthMethod,
  metadata: { address: 'oldpending' },
} as UserAuthStatus;

const now = Math.floor(Date.now() / 1000);
export const mockPayments = [
  {
    id: 0,
    authMethod: {
      config: { payment: [{ tokenId: 'ERG', amount: '100' }] },
    },
    metadata: { address: 'addr1' },
    createdAt: now,
    modifiedAt: now,

    user: {} as User,
    status: 'pending',
  } as UserAuthStatus,
  {
    id: 1,
    authMethod: {
      config: { payment: [{ tokenId: 'ERG', amount: '200' }] },
    },
    metadata: { address: 'addr2' },
  } as UserAuthStatus,

  {
    id: 2,
    authMethod: {
      config: { payment: [{ tokenId: 'ERG', amount: '100' }] },
    } as AuthMethod,
    metadata: { address: 'unpaidaddr' },
    createdAt:
      now - (mockConfig.expiresTime + mockConfig.expiresTimeDelay + 20),
  } as UserAuthStatus,

  {
    id: 3,
    authMethod: {
      config: { payment: [{ tokenId: 'ERG', amount: '100' }] },
    } as AuthMethod,
    metadata: { address: 'unpaidaddr' },
    createdAt:
      now - (mockConfig.expiresTime + mockConfig.expiresTimeDelay) + 20, // < 90, so still in delay
  } as UserAuthStatus,

  {
    id: 4,
    authMethod: { config: {} } as AuthMethod,
    metadata: { address: 'addr' },
  },
];
