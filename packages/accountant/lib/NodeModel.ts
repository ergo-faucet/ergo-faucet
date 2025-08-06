import axios, { AxiosInstance } from 'axios';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import {
  errorResponse,
  tokenByIdResponseSuccess,
  ConfirmedBalance,
  WalletBalancesAPIResponse,
} from './types';
import { Box, SignedTransaction } from '@fleet-sdk/common';

export class NodeModel {
  private static instance: NodeModel;
  private readonly logger: AbstractLogger;
  private axiosInstance: AxiosInstance | undefined;

  private constructor(axiosInstance: AxiosInstance, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.axiosInstance = axiosInstance;
  }

  /**
   * Initializes the NodeModel with an Axios instance configured for API requests.
   * This method must be called before using the NodeModel.
   */
  public static initialize = (nodeUrl: string, logger?: AbstractLogger) => {
    if (this.instance) {
      throw new Error('NodeModel instance has already been initialized.');
    }

    const axiosInstance = axios.create({
      baseURL: `${nodeUrl}`,
      timeout: 1000,
      headers: {
        accept: 'application/json',
      },
    });
    NodeModel.instance = new NodeModel(axiosInstance, logger);
  };

  /**
   * Returns the singleton instance of NodeModel.
   * Throws an error if not yet initialized.
   * @returns {NodeModel} The singleton instance.
   */
  public static getInstance = (): NodeModel => {
    if (!this.instance) {
      throw new Error('NodeModel instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Fetches the confirmed wallet balances for a given address.
   *
   * @param {string} address - The wallet address to fetch balances for.
   * @returns {Promise<ConfirmedBalance>} A promise that resolves to the confirmed balances (nanoErgs and tokens).
   * @throws {errorResponse} If the network object is not initialized.
   * @throws {errorResponse} If an Axios error occurs during the request.
   */
  public fetchWalletBalances = async (
    address: string,
  ): Promise<ConfirmedBalance> => {
    if (this.axiosInstance == undefined) {
      const error: errorResponse = {
        error: 500,
        reason: 'Internal Error',
        detail: 'The Network object has not been initialized!',
      };
      throw error;
    }

    return await this.axiosInstance
      .post<WalletBalancesAPIResponse>('/blockchain/balances', address)
      .then((response) => {
        this.logger.info('Successfully fetched wallet balances.');

        const confirmedBalance: ConfirmedBalance = response.data.confirmed;
        return confirmedBalance;
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Axios error.`, {
            error,
            message: error.message,
            stack: error.stack,
          });
          const errorResponse: errorResponse = {
            error: 500,
            reason: 'Internal Error',
            detail: 'Axios error!',
          };
          throw errorResponse;
        } else {
          throw error;
        }
      });
  };

  /**
   * Submits a signed Ergo transaction to the network.
   *
   * @param {SignedTransaction} signedTx - The signed transaction to be broadcasted.
   * @returns {Promise<string>} A promise that resolves to the transaction ID if successful.
   * @throws {errorResponse} If the network object is not initialized.
   * @throws {errorResponse} If an Axios error occurs during the request.
   */
  public submitTransaction = async (
    signedTx: SignedTransaction,
  ): Promise<string> => {
    if (this.axiosInstance == undefined) {
      const error: errorResponse = {
        error: 500,
        reason: 'Internal Error',
        detail: 'The Network object has not been initialized!',
      };
      throw error;
    }

    this.logger.debug(
      `Submitting signed transaction to the network...`,
      signedTx.id,
    );
    return await this.axiosInstance
      .post<string>('/transactions', signedTx)
      .then((res) => res.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error('Axios error.', {
            error,
            message: error.message,
            stack: error.stack,
          });
          const errorResponse: errorResponse = {
            error: 500,
            reason: 'Internal Error',
            detail: 'Axios error!',
          };
          throw errorResponse;
        } else {
          throw error;
        }
      });
  };

  /**
   * Fetches token details by its ID.
   *
   * @param {string} tokenId - The ID of the token to fetch.
   * @returns {Promise<tokenByIdResponseSuccess>} A promise that resolves to the token details.
   * @throws {errorResponse} If the network object is not initialized.
   * @throws {errorResponse} If an Axios error occurs during the request.
   */
  public getTokenById = async (
    tokenId: string,
  ): Promise<tokenByIdResponseSuccess> => {
    if (this.axiosInstance == undefined) {
      const error: errorResponse = {
        error: 500,
        reason: 'Internal Error',
        detail: 'The Network object has not been initialized!',
      };
      throw error;
    }
    return await this.axiosInstance
      .get<tokenByIdResponseSuccess>(`/blockchain/token/byId/${tokenId}`)
      .then((res) => res.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Axios error.`, {
            error,
            message: error.message,
            stack: error.stack,
          });
          const errorResponse: errorResponse = {
            error: 500,
            reason: 'Internal Error',
            detail: 'Axios error!',
          };
          throw errorResponse;
        } else {
          throw error;
        }
      });
  };

  /**
   * Fetches the inclusion height of a transaction by its ID.
   *
   * @param {string} transactionId - The ID of the transaction.
   * @returns {Promise<number | undefined>} A promise that resolves to the inclusion height of the transaction.
   * @throws Will log an error if the transaction data cannot be fetched.
   */
  public getInclusionHeight = async (
    transactionId: string,
  ): Promise<number> => {
    if (this.axiosInstance == undefined) {
      const error: errorResponse = {
        error: 500,
        reason: 'Internal Error',
        detail: 'The Network object has not been initialized!',
      };
      return Promise.reject(error);
    }

    return this.axiosInstance
      .get(`/blockchain/transaction/byId/${transactionId}`)
      .then((response) => {
        const inclusionHeight = response.data.inclusionHeight;
        this.logger.info(
          `Fetched inclusionHeight for transaction ${transactionId}: ${inclusionHeight}`,
        );
        return inclusionHeight;
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Axios error.`, {
            message: error.message,
            stack: error.stack,
          });
        }
        throw new Error('Failed to fetch inclusion height');
      });
  };
  /**
   * Fetches the current blockchain height.
   *
   * @returns {Promise<number>} A promise that resolves to the current blockchain height.
   * @throws Will log an error if the blockchain height cannot be fetched.
   */
  public getCurrentBlockchainHeight = async (): Promise<number> => {
    if (this.axiosInstance == undefined) {
      const error: errorResponse = {
        error: 500,
        reason: 'Internal Error',
        detail: 'The Network object has not been initialized!',
      };
      return Promise.reject(error);
    }

    return this.axiosInstance
      .get(`/blockchain/indexedHeight`)
      .then((response) => {
        const currentHeight = response.data.fullHeight;
        this.logger.info(`Current blockchain height: ${currentHeight}`);
        return currentHeight;
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Axios error.`, {
            message: error.message,
            stack: error.stack,
          });
        }
        throw new Error('Failed to fetch blockchain height');
      });
  };

  /**
   * Retrieves unspent boxes by their associated address
   *
   * @param {offset} - amount of elements to skip from the start
   * @param {limit} - amount of elements to retrieve
   * @returns {Box<bigint>[]} - returns desired boxes
   * @throws {errorResponse} - If an Axios error occurs during the request.
   */
  public getUnspentBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Box<bigint>[]> => {
    if (this.axiosInstance == undefined) {
      const error: errorResponse = {
        error: 500,
        reason: 'Internal Error',
        detail: 'The Network object has not been initialized!',
      };
      return Promise.reject(error);
    }

    return await this.axiosInstance
      .post(`/blockchain/box/unspent/byAddress`, address, {
        params: {
          offset: offset,
          limit: limit,
        },
      })
      .then((response) => {
        this.logger.info('The Boxes retrieved successfully.');
        return response.data;
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Axios error.`, {
            message: error.message,
            stack: error.stack,
          });
        } else this.logger.error(error);
      });
  };

  public isTransactionInMempool = async (
    TransactionId: string,
  ): Promise<boolean> => {
    if (this.axiosInstance == undefined) {
      const error: errorResponse = {
        error: 500,
        reason: 'Internal Error',
        detail: 'The Network object has not been initialized!',
      };
      return Promise.reject(error);
    }

    await this.axiosInstance
      .get(`/transactions/unconfirmed/${TransactionId}`)
      .then((response) => {
        if (response.status === 200) return true;
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Axios error.`, {
            message: error.message,
            stack: error.stack,
          });
        } else this.logger.error(error);
      });
    return false;
  };
}
