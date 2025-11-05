import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterAll,
  beforeAll,
} from 'vitest';

import { PaymentAuth } from '..';
import { FastifyAPIServer, FastifyRequest } from '@ergo-faucet/fastify-server';

import {
  mockConfig,
  mockFastifyConfig,
  mockLogger,
  mockNodeModel,
  mockPaymentAction,
  mockWallet,
} from './mockUtils';
import {
  getAddressPayload,
  mockExpiredPendingStatus,
  mockExpiredStatus,
  mockFailedStatus,
  mockNewStatus,
  mockPassedStatus,
  mockPayments,
  mockPendingStatus,
} from './testData';
import { toDTO } from '../lib/utils';
import { NotFoundError } from '@ergo-faucet/database';
import { UserAuthStatus } from '@ergo-faucet/database';

describe('PaymentAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('POST /auth/payment', () => {
    let fastifyInstance: FastifyAPIServer;
    const userId = 123;
    beforeAll(async () => {
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockFastifyConfig);
      fastifyInstance = FastifyAPIServer.getInstance();

      PaymentAuth.initialize(
        {
          ...mockConfig,
          fastifyServer: fastifyInstance,
        },
        mockLogger,
      );

      vi.spyOn(fastifyInstance, 'authPreHandler').mockImplementation(
        (verifyAndEnforce: boolean = true) => {
          return async (request: FastifyRequest) => {
            if (!verifyAndEnforce) return;
            else {
              // Simulate JWT verification and set request.user
              request.user = {
                userId,
                address: 'mocked-user-address',
              };
            }
          };
        },
      );

      vi.spyOn(fastifyInstance, 'captchaPreHandler').mockImplementation(
        async () => {},
      );

      await fastifyInstance.start();
    });

    /**
     * Test for generating new payment address when no prior status exists
     * @scenario
     * - User has no existing payment auth status
     * @expected
     * - New unique address generated and status created with 'pending'
     */
    it('should return new payment address if no existing status', async () => {
      // Arrange
      mockPaymentAction.getUserPaymentAuthStatus.mockResolvedValue(null);
      const mockIndex = 5;
      mockPaymentAction.getAndIncrementCounter.mockResolvedValue(mockIndex);
      const mockAddress = 'newaddress';
      mockWallet.generateUniquePaymentAddress.mockReturnValue(mockAddress);
      mockPaymentAction.addUserPaymentAuthStatus.mockResolvedValue(
        mockNewStatus,
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(mockPaymentAction.getUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
      );
      expect(mockPaymentAction.getAndIncrementCounter).toHaveBeenCalled();
      expect(mockWallet.generateUniquePaymentAddress).toHaveBeenCalledWith(
        mockIndex,
      );
      expect(mockPaymentAction.addUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
        mockAddress,
      );
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(
        toDTO(mockNewStatus, mockConfig.expiresTime),
      );
    });

    /**
     * Test for regenerating address when previous status is 'failed'
     * @scenario
     * - Existing status is 'failed'
     * @expected
     * - New address generated and new pending status created
     */
    it('should return new payment address if existing status is failed', async () => {
      // Arrange
      mockPaymentAction.getUserPaymentAuthStatus.mockResolvedValue(
        mockFailedStatus,
      );
      const mockIndex = 6;
      mockPaymentAction.getAndIncrementCounter.mockResolvedValue(mockIndex);
      const mockAddress = 'newaddress2';
      mockWallet.generateUniquePaymentAddress.mockReturnValue(mockAddress);
      const mockNewPendingStatus = {
        ...mockNewStatus,
        id: 12,
        metadata: { address: mockAddress },
      };
      mockPaymentAction.addUserPaymentAuthStatus.mockResolvedValue(
        mockNewPendingStatus,
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(mockPaymentAction.getUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
      );
      expect(mockPaymentAction.getAndIncrementCounter).toHaveBeenCalled();
      expect(mockWallet.generateUniquePaymentAddress).toHaveBeenCalledWith(
        mockIndex,
      );
      expect(mockPaymentAction.addUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
        mockAddress,
      );
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(
        toDTO(mockNewPendingStatus, mockConfig.expiresTime),
      );
    });

    /**
     * Test for regenerating address when status is expired
     * @scenario
     * - Existing status is expired
     * @expected
     * - New address generated and new pending status created
     */
    it('should return new payment address if existing status is expired', async () => {
      // Arrange
      mockPaymentAction.getUserPaymentAuthStatus.mockResolvedValue(
        mockExpiredStatus,
      );
      const mockIndex = 6;
      mockPaymentAction.getAndIncrementCounter.mockResolvedValue(mockIndex);
      const mockAddress = 'newaddress2';
      mockWallet.generateUniquePaymentAddress.mockReturnValue(mockAddress);
      const mockNewPendingStatus = {
        ...mockNewStatus,
        id: 12,
        metadata: { address: mockAddress },
      };
      mockPaymentAction.addUserPaymentAuthStatus.mockResolvedValue(
        mockNewPendingStatus,
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(mockPaymentAction.getUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
      );
      expect(mockPaymentAction.getAndIncrementCounter).toHaveBeenCalled();
      expect(mockWallet.generateUniquePaymentAddress).toHaveBeenCalledWith(
        mockIndex,
      );
      expect(mockPaymentAction.addUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
        mockAddress,
      );
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(
        toDTO(mockNewPendingStatus, mockConfig.expiresTime),
      );
    });

    /**
     * Test for returning existing passed status
     * @scenario
     * - User has already passed payment auth
     * @expected
     * - Returns existing 'passed' status without generating new address
     */
    it('should return existing status if passed', async () => {
      // Arrange

      mockPaymentAction.getUserPaymentAuthStatus.mockResolvedValue(
        mockPassedStatus,
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(mockPaymentAction.getUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
      );
      expect(mockPaymentAction.getAndIncrementCounter).not.toHaveBeenCalled();
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(
        toDTO(mockPassedStatus, mockConfig.expiresTime),
      );
    });

    /**
     * Test for returning non-expired pending status
     * @scenario
     * - Status is 'pending' and not expired
     * @expected
     * - Returns current pending status without changes
     */
    it('should return existing status if pending and not expired', async () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const pendingStatus: UserAuthStatus = {
        ...mockPendingStatus,
        createdAt: now,
        modifiedAt: now,
      };
      mockPaymentAction.getUserPaymentAuthStatus.mockResolvedValue(
        pendingStatus,
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(mockPaymentAction.getUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
      );
      expect(
        mockPaymentAction.updateUserPaymentAuthStatus,
      ).not.toHaveBeenCalled();
      expect(mockPaymentAction.getAndIncrementCounter).not.toHaveBeenCalled();
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(
        toDTO(pendingStatus, mockConfig.expiresTime),
      );
    });

    /**
     * Test for handling expired pending status
     * @scenario
     * - Status is 'pending' but expired
     * @expected
     * - Marks old status as 'failed', generates new address and pending status
     */
    it('should mark as failed and return new if pending and expired', async () => {
      // Arrange
      mockPaymentAction.getUserPaymentAuthStatus.mockResolvedValue(
        mockExpiredPendingStatus,
      );
      const mockIndex = 7;
      mockPaymentAction.getAndIncrementCounter.mockResolvedValue(mockIndex);
      const mockAddress = 'newaddress3';
      mockWallet.generateUniquePaymentAddress.mockReturnValue(mockAddress);
      const mockNewPendingStatus = {
        ...mockNewStatus,
        id: 13,
        metadata: { address: mockAddress },
      };
      mockPaymentAction.addUserPaymentAuthStatus.mockResolvedValue(
        mockNewPendingStatus,
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(mockPaymentAction.getUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
      );
      expect(
        mockPaymentAction.updateUserPaymentAuthStatus,
      ).toHaveBeenCalledWith(mockExpiredPendingStatus, 'failed');
      expect(mockPaymentAction.getAndIncrementCounter).toHaveBeenCalled();
      expect(mockWallet.generateUniquePaymentAddress).toHaveBeenCalledWith(
        mockIndex,
      );
      expect(mockPaymentAction.addUserPaymentAuthStatus).toHaveBeenCalledWith(
        userId,
        getAddressPayload.authMethodId,
        getAddressPayload.packageId,
        mockAddress,
      );
      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(
        toDTO(mockNewPendingStatus, mockConfig.expiresTime),
      );
    });

    /**
     * Test for NotFoundError handling
     * @scenario
     * - Package or auth method not found
     * @expected
     * - Returns 400 with NOT_FOUND error
     */
    it('should return 400 on NotFoundError', async () => {
      // Arrange
      mockPaymentAction.getUserPaymentAuthStatus.mockRejectedValue(
        new NotFoundError('Package not found'),
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(result.statusCode).toEqual(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Package not found',
        code: 'NOT_FOUND',
      });
    });

    /**
     * Test for internal server error handling
     * @scenario
     * - Unexpected database or system error
     * @expected
     * - Returns 500 with internal-error
     */
    it('should return 500 on internal error', async () => {
      // Arrange
      mockPaymentAction.getUserPaymentAuthStatus.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      const result = await fastifyInstance['fastify'].inject({
        method: 'POST',
        url: '/auth/payment',
        payload: getAddressPayload,
      });

      // Assert
      expect(result.statusCode).toEqual(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error occured',
        code: 'internal-error',
      });
    });
  });

  describe('processPayments', () => {
    let instance: PaymentAuth;
    beforeAll(async () => {
      // eslint-disable-next-line
      (PaymentAuth as any).instance = undefined;
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockFastifyConfig);
      const fastifyInstance = FastifyAPIServer.getInstance();
      PaymentAuth.initialize(
        {
          ...mockConfig,
          // eslint-disable-next-line
          fastifyServer: fastifyInstance,
        },
        mockLogger,
      );

      instance = PaymentAuth.getInstance();
    });

    /**
     * Test for processing multiple pending payments
     * @scenario
     * - Multiple unpaid records exist
     * @expected
     * - checkForPayment called for each address
     */
    it('should process all pending payments', async () => {
      // Arrange
      mockPaymentAction.getUnpaidRecords.mockResolvedValue([
        mockPayments[0],
        mockPayments[1],
      ]);
      mockNodeModel.checkForPayment.mockResolvedValue(false);

      // Act
      await instance.processPayments();

      // Assert
      expect(mockPaymentAction.getUnpaidRecords).toHaveBeenCalled();
      expect(mockNodeModel.checkForPayment).toHaveBeenCalledTimes(2);
      expect(mockNodeModel.checkForPayment).toHaveBeenNthCalledWith(
        1,
        mockPayments[0].metadata.address,
        mockPayments[0].authMethod.config.payment,
      );
      expect(mockNodeModel.checkForPayment).toHaveBeenNthCalledWith(
        2,
        mockPayments[1].metadata.address,
        mockPayments[1].authMethod.config.payment,
      );
    });

    /**
     * Test for error handling in processPayments
     * @scenario
     * - Database error during fetch
     * @expected
     * - Logs warning, continues gracefully
     */
    it('should handle errors gracefully', async () => {
      // Arrange
      mockPaymentAction.getUnpaidRecords.mockRejectedValue(
        new Error('DB timeout'),
      );

      // Act
      await instance.processPayments();

      // Assert
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('handlePaymentAuth', () => {
    let instance: PaymentAuth;
    beforeAll(async () => {
      // eslint-disable-next-line
      (PaymentAuth as any).instance = undefined;
      // eslint-disable-next-line
      (FastifyAPIServer as any).instance = undefined;
      await FastifyAPIServer.initialize(mockFastifyConfig);
      const fastifyInstance = FastifyAPIServer.getInstance();
      PaymentAuth.initialize(
        {
          ...mockConfig,
          fastifyServer: fastifyInstance,
        },
        mockLogger,
      );

      instance = PaymentAuth.getInstance();
    });

    /**
     * Test for successful payment detection
     * @scenario
     * - Payment received on address
     * @expected
     * - Marks user as passed
     */
    it('should pass payment if paid', async () => {
      // Arranges
      mockNodeModel.checkForPayment.mockResolvedValue(true);

      // Act
      await instance.handlePaymentAuth(mockPayments[0] as UserAuthStatus);

      // Assert
      expect(mockNodeModel.checkForPayment).toHaveBeenCalledWith(
        mockPayments[0].metadata.address,
        mockPayments[0].authMethod.config.payment,
      );
      expect(mockPaymentAction.passUserPayment).toHaveBeenCalledWith(
        mockPayments[0],
      );
    });

    /**
     * Test for failed payment after expiration
     * @scenario
     * - No payment and fully expired
     * @expected
     * - Status updated to 'failed'
     */
    it('should mark as failed if not paid and fully expired', async () => {
      // Arrange
      mockNodeModel.checkForPayment.mockResolvedValue(false);

      // Act
      await instance.handlePaymentAuth(mockPayments[2] as UserAuthStatus);

      // Assert
      expect(mockNodeModel.checkForPayment).toHaveBeenCalledWith(
        mockPayments[2].metadata.address,
        mockPayments[2].authMethod.config.payment,
      );
      expect(
        mockPaymentAction.updateUserPaymentAuthStatus,
      ).toHaveBeenCalledWith(mockPayments[2], 'failed');
    });

    /**
     * Test for pending payment within delay window
     * @scenario
     * - No payment but still within allowed time
     * @expected
     * - No status update
     */
    it('should do nothing if not paid and within delay window', async () => {
      // Arrange
      mockNodeModel.checkForPayment.mockResolvedValue(false);

      // Act
      await instance.handlePaymentAuth(mockPayments[3] as UserAuthStatus);

      // Assert
      expect(mockNodeModel.checkForPayment).toHaveBeenCalledWith(
        mockPayments[3].metadata.address,
        mockPayments[3].authMethod.config.payment,
      );
      expect(
        mockPaymentAction.updateUserPaymentAuthStatus,
      ).not.toHaveBeenCalled();
      expect(mockPaymentAction.passUserPayment).not.toHaveBeenCalled();
    });
    /**
     * Test for invalid auth method configuration
     * @scenario
     * - Auth method missing payment config
     * @expected
     * - Throws error
     */
    it('should throw if no payment config', async () => {
      // Act & Assert
      await expect(
        instance.handlePaymentAuth(mockPayments[4] as UserAuthStatus),
      ).rejects.toThrow(Error);
    });
  });
});
