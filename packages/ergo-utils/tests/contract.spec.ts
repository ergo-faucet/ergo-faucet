import { describe, expect, it } from 'vitest';
import { execute, mockUTxO } from '@fleet-sdk/mock-chain';
import { OutputBuilder, TransactionBuilder } from '@fleet-sdk/core';
import { SGroupElement, SInt, SLong, SSigmaProp } from '@fleet-sdk/serializer';
import { ErgoHDKey, generateMnemonic } from '@fleet-sdk/wallet';
import { compile } from '@fleet-sdk/compiler';
import { TransactionExecutionResult } from '../lib';
import * as fs from 'fs';
import path from 'path';

describe('faucetTrueContract test', async () => {
  const SCRIPT_DIR = path.join(import.meta.dirname, `../lib/scripts/`);
  const script = fs.readFileSync(
    path.join(SCRIPT_DIR, 'faucetTrueContract.es'),
    'utf8',
  );

  const minFee = 1_000_000n;
  const mockHeight = 100;

  const faucetParty =
    ErgoHDKey.fromMnemonicSync(generateMnemonic()).deriveChild(0);

  const ownerParty =
    ErgoHDKey.fromMnemonicSync(generateMnemonic()).deriveChild(0);

  const count = 5;

  const contract = compile(script, {
    map: {
      index: SInt(-count),
      faucetPK: SSigmaProp(SGroupElement(faucetParty.publicKey)),
      ownerPK: SSigmaProp(SGroupElement(ownerParty.publicKey)),
      MIN_FEE: SLong(minFee),
    },
  });

  const tokenId1 =
    '7a58ed6432f73abd7197567cbc249ff0e9ccfaa2d214afc29748906d7bd6bf71';

  const tokenId2 =
    '2865190ddb74456b43958da7542b177cb6da1d1f214b71aad8f8e50d8cdd7801';

  const inputBox1 = mockUTxO({
    ergoTree: contract.toAddress().ergoTree,
    value: 2_000_000_000n,
    assets: [{ amount: 10n, tokenId: tokenId1 }],
  });

  const inputBox2 = mockUTxO({
    ergoTree: contract.toAddress().ergoTree,
    value: 150_000_000_000n,
    assets: [
      { amount: 20n, tokenId: tokenId1 },
      { amount: 10n, tokenId: tokenId2 },
    ],
  });

  const inputBox3 = mockUTxO({
    ergoTree: contract.toAddress().ergoTree,
    value: 100_000_000n,
    assets: [{ amount: 20n, tokenId: tokenId2 }],
  });

  const inputBox4 = mockUTxO({
    ergoTree: contract.toAddress().ergoTree,
    value: 2_000_000_000n,
  });

  const inputs = [inputBox1, inputBox2, inputBox3, inputBox4];

  const totalErgs = inputs.reduce((prv: bigint, curr) => {
    return prv + curr.value;
  }, 0n);

  it('should spend boxes correctly when all of the contract conditions are staisfied and tx is signed by faucet party', () => {
    const box0Ergs = totalErgs - minFee;
    const unsignedTX = new TransactionBuilder(mockHeight)
      .to(
        new OutputBuilder(box0Ergs, ownerParty.address).addTokens([
          { tokenId: tokenId1, amount: 30n },
          { tokenId: tokenId2, amount: 30n },
        ]),
      )
      .from(inputs)
      .sendChangeTo(ownerParty.address)
      .payFee(minFee)
      .build();

    expect(
      execute(unsignedTX.toEIP12Object(), [faucetParty], undefined).success,
    ).toBe(true);
    expect(
      (
        execute(
          unsignedTX.toEIP12Object(),
          [faucetParty],
          undefined,
        ) as TransactionExecutionResult
      ).reason,
    ).toBe(undefined);
  });

  it('should spend boxes correctly when all of the contract conditions are staisfied and tx is signed by owner party', () => {
    const box0Ergs = totalErgs - minFee;
    const unsignedTX = new TransactionBuilder(mockHeight)
      .to(
        new OutputBuilder(box0Ergs, ownerParty.address).addTokens([
          { tokenId: tokenId1, amount: 30n },
          { tokenId: tokenId2, amount: 30n },
        ]),
      )
      .from(inputs)
      .sendChangeTo(ownerParty.address)
      .payFee(minFee)
      .build();

    execute(unsignedTX.toEIP12Object(), [ownerParty], undefined);
    expect(
      execute(unsignedTX.toEIP12Object(), [ownerParty], undefined).success,
    ).toBe(true);
    expect(
      (
        execute(
          unsignedTX.toEIP12Object(),
          [ownerParty],
          undefined,
        ) as TransactionExecutionResult
      ).reason,
    ).toBe(undefined);
  });

  it('should not let the boxes to be spent when all of ergs are not in OUTPUTS(0) even if they go to ownerPK', () => {
    const box0Ergs = totalErgs - minFee - 1n;
    const unsignedTX = new TransactionBuilder(mockHeight)
      .to(
        new OutputBuilder(box0Ergs, ownerParty.address).addTokens([
          { tokenId: tokenId1, amount: 30n },
          { tokenId: tokenId2, amount: 30n },
        ]),
      )
      .from(inputs)
      .sendChangeTo(ownerParty.address)
      .payFee(minFee)
      .build();

    expect(
      execute(unsignedTX.toEIP12Object(), [faucetParty], undefined).success,
    ).toBe(false);
  });

  it('should not let the boxes to be spent when all of tokens are not in OUTPUTS(0) even if they go to ownerPK', () => {
    const box0Ergs = totalErgs - minFee;

    const unsignedTX = new TransactionBuilder(mockHeight)
      .to([
        new OutputBuilder(box0Ergs, ownerParty.address).addTokens([
          { tokenId: tokenId1, amount: 10n },
          { tokenId: tokenId2, amount: 30n },
        ]),
        new OutputBuilder(minFee, ownerParty.address).addTokens([
          { tokenId: tokenId1, amount: 20n },
        ]),
      ])
      .from(inputs)
      .sendChangeTo(ownerParty.address)
      .build();

    expect(
      execute(unsignedTX.toEIP12Object(), [faucetParty], undefined).success,
    ).toBe(false);
  });

  it('should not let the boxes to be spent if any token is burned', () => {
    const box0Ergs = totalErgs - minFee;

    const unsignedTX = new TransactionBuilder(mockHeight)
      .to(
        new OutputBuilder(box0Ergs, ownerParty.address).addTokens([
          { tokenId: tokenId1, amount: 10n },
          { tokenId: tokenId2, amount: 30n },
        ]),
      )
      .from(inputs)
      .burnTokens([{ tokenId: tokenId1, amount: 20n }])
      .sendChangeTo(ownerParty.address)
      .build();

    expect(
      execute(unsignedTX.toEIP12Object(), [faucetParty], undefined).success,
    ).toBe(false);
  });

  it('should not let the boxes to be spent if output(0) is going to faucet address', () => {
    const box0Ergs = totalErgs - minFee;
    const unsignedTX = new TransactionBuilder(mockHeight)
      .to(
        new OutputBuilder(box0Ergs, faucetParty.address).addTokens([
          { tokenId: tokenId1, amount: 30n },
          { tokenId: tokenId2, amount: 30n },
        ]),
      )
      .from(inputs)
      .sendChangeTo(ownerParty.address)
      .payFee(minFee)
      .build();

    expect(
      execute(unsignedTX.toEIP12Object(), [faucetParty], undefined).success,
    ).toBe(false);
  });
});
