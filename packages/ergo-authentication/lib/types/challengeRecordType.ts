export interface ChallengeRecord {
  address: string;
  challenge: string;
  createdAt: number;
}

export type ChallengeVerificationResult =
  | { success: true }
  | {
      success: false;
      code: 'challenge-not-found' | 'challenge-mismatch' | 'invalid-signature';
      message: string;
    };
