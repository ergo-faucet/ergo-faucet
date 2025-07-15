export interface VerifySignatureParams {
  address: string;
  signedMessage: string;
  proof: string;
}

export interface VerifyParams {
  verifySignatureParams: VerifySignatureParams;
  captchaToken: string;
}
