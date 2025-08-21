import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ErgoUnsignedTransaction, BoxSelector } from '@fleet-sdk/core';
import {
  SignedTransaction,
  Box,
  TokenTargetAmount,
  ensureUTxOBigInt,
  Network,
} from '@fleet-sdk/common';
import { ErgoHDKey, Prover } from '@fleet-sdk/wallet';
import { NodeModel } from './NodeModel';
import { NotEnoughAssetsError } from '.';

export class Wallet {
  private static instance: Wallet;
  private readonly logger: AbstractLogger;
  private readonly prover: Prover;
  private readonly childKey: ErgoHDKey;
  private readonly walletAddress: string;

  private constructor(
    mnemonic: string,
    network: Network,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ? logger : new DummyLogger();
    this.prover = new Prover();
    const rootKey = ErgoHDKey.fromMnemonicSync(mnemonic);
    this.childKey = rootKey.deriveChild(0);
    this.walletAddress = this.childKey.address.encode(network);
    this.logger.debug('First address of the mnemonic', this.walletAddress);
  }

  public static initialize = (
    mnemonic: string,
    network: Network,
    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error('Wallet instance has already been initialized.');
    }
    Wallet.instance = new Wallet(mnemonic, network, logger);
  };

  /**
   * Returns the singleton instance of Wallet.
   * Throws an error if not yet initialized.
   * @returns {Wallet} The singleton instance.
   */
  public static getInstance = (): Wallet => {
    if (!this.instance) {
      throw new Error('Wallet instance has not been initialized.');
    }
    return this.instance;
  };

  /**
   * Generates the wallet address based on the mnemonic.
   *
   * @returns {string} - the wallet address of the child key.
   *
   */
  public getWalletAddress = (): string => {
    return this.walletAddress;
  };

  /**
   * Signs an unsigned Ergo transaction using the first derived child key from the mnemonic.
   *
   * @param {ErgoUnsignedTransaction} unsignedTx - The unsigned Ergo transaction to be signed.
   * @returns {Promise<SignedTransaction>} A promise that resolves to the signed transaction.
   *
   */
  public signTransaction = (
    unsignedTx: ErgoUnsignedTransaction,
  ): SignedTransaction => {
    this.logger.debug(`Signing transaction: ${JSON.stringify(unsignedTx)}`);

    const signedTx: SignedTransaction = this.prover.signTransaction(
      unsignedTx,
      [this.childKey],
    );
    this.logger.debug(
      `Transaction signed successfully ${JSON.stringify(signedTx)}`,
    );
    return signedTx;
  };

  /**
   * select boxes that meet the min requirements
   * @param amount - The amount of ERGs in nanoerg
   * @param tokens - The list of tokens needed
   * @returns {Box<bigint>[]} - A list of selected boxes that have enough tokens and nanoergs
   */
  public selectBoxes = async (
    amount: bigint,
    tokens: TokenTargetAmount<bigint>[] = [],
  ): Promise<Box<bigint>[]> => {
    const address: string = this.walletAddress;
    let offset: number = 0;
    const limit: number = 100;

    const boxes: Box<bigint>[] = [];
    let receivedBoxes: Box<bigint>[] = [];
    do {
      receivedBoxes = await NodeModel.getInstance().getUnspentBoxes(
        address,
        offset,
        limit,
      );
      this.logger.debug('Successfully retrieved boxes');
      offset += limit;

      // updating boxes
      receivedBoxes.forEach((box) => {
        boxes.push(ensureUTxOBigInt(box));
      });

      const selector: BoxSelector<Box<bigint>> = new BoxSelector(boxes);
      try {
        const selctedBoxes: Box<bigint>[] = selector.select({
          nanoErgs: amount,
          tokens: tokens,
        });
        this.logger.debug('Boxes have enough assets.');
        return selctedBoxes;
      } catch (error) {
        // the error is usual as we are using pagination
        if (error instanceof Error) this.logger.debug(error.message);
      }
    } while (receivedBoxes.length); //till no more boxes are there

    // if didn't return with selcted boxes
    throw new NotEnoughAssetsError('Not enough ERG/tokens.');
  };
}
