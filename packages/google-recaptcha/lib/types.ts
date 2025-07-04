export interface reCAPTCHAResponse {
  success: boolean;
  score?: number; // the score for this request (0.0 - 1.0)
  action?: string;
  challenge_ts: string; // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
  hostname: string; // the hostname of the site where the reCAPTCHA was solved
  error_codes: string[]; // optional
}

export interface verifyQuery {
  secret: string;
  response: string;
  remoteip?: string;
}
