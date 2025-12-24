export interface SessionData {
  userId: number;
  frontState: string;
  code_verifier?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresInSecond: number;
}
