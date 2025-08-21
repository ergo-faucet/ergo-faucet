interface errorResponse {
  error: number;
  reason: string;
  detail: string;
}

export interface tokenByIdResponseSuccess {
  id: string;
  boxId: string;
  emissionAmount: number;
  name: string;
  description: string;
  decimals: number;
}

export type tokenByIdResponse = tokenByIdResponseSuccess | errorResponse;
export type { errorResponse };
