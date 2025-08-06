export interface Token {
  tokenId: string;
  amount: number;
}

export interface ConfirmedBalance {
  nanoErgs: number;
  tokens: Token[];
}

export interface UnconfirmedBalance {
  nanoErgs: number;
  tokens: Token[];
}

export interface WalletBalancesAPIResponse {
  confirmed: ConfirmedBalance;
  unconfirmed: UnconfirmedBalance;
}
