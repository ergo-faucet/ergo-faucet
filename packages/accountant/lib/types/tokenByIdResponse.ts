export interface tokenByIdResponseSuccess {
  id: string;
  boxId: string;
  emissionAmount: number;
  name: string;
  description: string;
  decimals: number;
}

export interface errorResponse {
  error: number;
  reason: string;
  detail: string;
}

export type tokenByIdResponse = tokenByIdResponseSuccess | errorResponse;
