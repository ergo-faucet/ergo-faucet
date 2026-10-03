import { Network } from '@fleet-sdk/common';
import {
  type BlockchainParameters,
  BlockchainStateContext,
} from 'sigmastate-js/main';

export type TransactionExecutionResult = {
  success: boolean;
  reason?: string;
};

export type ExecutionParameters = {
  context?: BlockchainStateContext;
  parameters?: BlockchainParameters;
  network?: Network;
  baseCost?: number;
};
