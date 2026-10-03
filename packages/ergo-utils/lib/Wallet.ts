import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  BoxSelector,
  ErgoAddress,
  ErgoUnsignedTransaction,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import {
  SignedTransaction,
  Box,
  TokenTargetAmount,
  ensureUTxOBigInt,
  Network,
  TokenAmount,
  Base58String,
} from '@fleet-sdk/common';
import { ErgoHDKey, Prover } from '@fleet-sdk/wallet';
import { NodeModel } from './NodeModel';

import { compile } from '@fleet-sdk/compiler';
import {
  SSigmaProp,
  SGroupElement,
  SInt,
  serializeTransaction,
  SLong,
} from '@fleet-sdk/serializer';
import * as fs from 'fs';
import path from 'path';

import { NotEnoughAssetsError, WalletConfig } from './types';
import { execute, TransactionExecutionResult } from './utils';

import { hex } from '@fleet-sdk/crypto';

export class Wallet {
  private static instance: Wallet;
  private readonly logger: AbstractLogger;
  private readonly prover: Prover;
  private readonly childKey: ErgoHDKey;
  private readonly walletAddress: string;
  private readonly network: Network;
  private readonly scriptName: string;
  private readonly paymentScript: string;
  private readonly minFee: bigint;

  private constructor(walletConfig: WalletConfig, logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
    this.prover = new Prover();
    this.network = walletConfig.network;
    this.scriptName = walletConfig.scriptName;
    this.minFee = walletConfig.minFee;

    if (walletConfig.privateKey) {
      this.childKey = new ErgoHDKey({
        privateKey: Buffer.from(walletConfig.privateKey, 'hex'),
      });
    } else if (walletConfig.mnemonic) {
      const rootKey = ErgoHDKey.fromMnemonicSync(walletConfig.mnemonic, {
        passphrase: walletConfig.passphrase,
      });

      this.childKey = rootKey.deriveChild(0);
    } else {
      throw new Error(
        'Wallet configuration must include either a mnemonic phrase or a private key.',
      );
    }

    this.walletAddress = this.childKey.address.encode(walletConfig.network);

    const SCRIPT_DIR = path.join(import.meta.dirname, `../lib/scripts/`);
    this.paymentScript = fs.readFileSync(
      path.join(SCRIPT_DIR, this.scriptName),
      'utf8',
    );

    this.logger.debug('First address of the mnemonic', this.walletAddress);
  }

  public static initialize = (
    walletConfig: WalletConfig,

    logger?: AbstractLogger,
  ): void => {
    if (this.instance) {
      throw new Error('Wallet instance has already been initialized.');
    }

    Wallet.instance = new Wallet(walletConfig, logger);
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

  /**
   * Generates a unique payment address derived from the wallet's child key.
   *
   * Compiles the controller script using:
   *  - faucetPK set to the child's public key
   *  - trueScriptsIndex set to -count (to produce a distinct script/address per count)
   *  - If script is faucetTrueContract.es and ownerPK is provided, it is included in the script compilation along with MIN_FEE.
   *
   * @param count - Non-negative integer used to derive a unique script index.
   * @returns {string} The generated payment address.
   */
  public generateUniquePaymentAddress = (
    count: number,
    ownerPK?: Base58String,
  ): string => {
    let paymentContract;

    if (this.scriptName === 'truePaymentScript.es') {
      paymentContract = compile(this.paymentScript, {
        map: {
          faucetPK: SSigmaProp(SGroupElement(this.childKey.publicKey)),
          trueScriptsIndex: SInt(-count),
        },
      });
    } else if (this.scriptName === 'faucetTrueContract.es' && ownerPK) {
      paymentContract = compile(this.paymentScript, {
        map: {
          faucetPK: SSigmaProp(SGroupElement(this.childKey.publicKey)),
          ownerPK: SSigmaProp(
            SGroupElement(ErgoAddress.fromBase58(ownerPK).getPublicKeys()[0]),
          ),
          index: SInt(-count),
          MIN_FEE: SLong(this.minFee),
        },
      });
    } else {
      throw new Error('Not provided ownerPK');
    }
    const paymentAddress = paymentContract.toAddress(this.network).toString();
    this.logger.debug(`Generated unique payment address: ${paymentAddress}`);
    return paymentAddress;
  };

  /**
   * Returns the ErgoTree for the wallet's first derived address.
   * @returns {string} Hex-encoded ErgoTree of the wallet's child address.
   */
  public getErgoTree = () => {
    return this.childKey.address.ergoTree;
  };

  /**
   * Collect unspent boxes from the given contractAddresses, consolidate ERG and tokens,
   * build, sign and submit a single transaction sending (totalErgs - minFee) and tokens to ownerPK.
   *
   * @param ownerPK Base58String - recipient address/public key (base58)
   * @param contractAddresses Base58String[] - contract addresses to collect boxes from
   * @throws Error if transaction execution/submission fails or no boxes found
   */
  public collectUserPaidBoxes = async (
    ownerPK: Base58String,
    contractAddresses: Base58String[],
  ): Promise<void> => {
    // gather boxes from all contract addresses (paginated)
    const contractBoxes: Box<bigint>[] = [];
    for (const contractAddress of contractAddresses) {
      this.logger.debug(
        `Fetching unspent contract boxes for address: ${contractAddress}`,
      );
      let receivedBoxes: Box<bigint>[] = [];
      let offset: number = 0;
      const limit: number = 100;
      do {
        receivedBoxes = await NodeModel.getInstance().getUnspentBoxes(
          contractAddress,
          offset,
          limit,
        );
        this.logger.debug('Successfully retrieved boxes');
        offset += limit;

        // updating boxes
        receivedBoxes.forEach((box) => {
          contractBoxes.push(ensureUTxOBigInt(box));
        });
      } while (receivedBoxes.length); // till no more boxes are there
    }
    this.logger.debug(`Collected ${contractBoxes.length} contract boxes`);

    const totalErgs = contractBoxes.reduce((sum, box) => sum + box.value, 0n);
    this.logger.debug('Total ERG in inputs:', totalErgs.toString());
    this.logger.debug(
      'Total ERG in outputs:',
      (totalErgs - this.minFee).toString(),
    );

    const currentHeight =
      await NodeModel.getInstance().getCurrentBlockchainHeight();
    this.logger.debug('Current block height:', currentHeight);

    // aggregate tokens
    const tokens: TokenAmount<bigint>[] = [];
    contractBoxes
      .map((box) => box.assets)
      .forEach((arr) => tokens.push(...arr));

    // build unsigned tx
    const unsignedTx = new TransactionBuilder(currentHeight)
      .from(contractBoxes)
      .to(new OutputBuilder(totalErgs - this.minFee, ownerPK).addTokens(tokens))
      .payFee(this.minFee)
      .sendChangeTo(ErgoAddress.fromBase58(ownerPK).ergoTree)
      .build();

    this.logger.debug(
      `Unsigned spend transaction built. ${JSON.stringify(unsignedTx.toEIP12Object())}`,
    );

    // execute/sign and submit
    this.logger.debug('Loading blockchain context & parameters');
    const context = await NodeModel.getInstance().getBlockchainContext();
    const parameters = await NodeModel.getInstance().getBlockchainParameters();

    const executedTx = execute(unsignedTx, [this.childKey], {
      context,
      network: this.network,
      parameters,
    });

    if (
      executedTx === undefined ||
      (executedTx as TransactionExecutionResult).success === false
    ) {
      this.logger.warn('Execution failed, tx not submitted');
      throw new Error('Transaction execution failed');
    } else {
      this.logger.debug('Execution successful, submitting tx...');
      const serializedTx = hex.encode(
        serializeTransaction(executedTx as SignedTransaction).toBytes(),
      );
      await NodeModel.getInstance().submitTransactionBytes(serializedTx);
      this.logger.info('Transaction submitted successfully');
    }
  };
}
