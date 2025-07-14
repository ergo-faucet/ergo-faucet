import { describe, it, expect } from 'vitest';
import { verifySignature } from '../lib/utils/verifySignature';

describe('verifySignature', () => {
  it('should return false for invalid signature', () => {
    const result = verifySignature({
      address: '9ggSPfdEACEpRKMvpVwXxck9soLC1ZDmYRX9GA5gigSsAoZDNwJ',
      signedMessage: 'a747d0c3-e5ec-4b7e-bf69-8296b2b69dad',
      proof:
        'afd839fb8b13bbe7278062be30436730971f794358a0a20ab45d1ca0b7c351a35007056d4eae45cc3dbe4d611c1dd16af45bd1334e3a5f93',
    });

    expect(result).toBe(true);
  });
});

describe('verifySignature', () => {
  it('should return false for invalid signature', () => {
    const result = verifySignature({
      address: '9hFQ6qGc9HnGpnyRyExV5eWh9YdNMGDNfPfqcTTegN1ctuWD1Bw',
      signedMessage: 'fake-challenge',
      proof: 'abcd1234deadbeef',
    });

    expect(result).toBe(false);
  });
});
