import { Type } from '@sinclair/typebox';

export const AuthenticationBody = Type.Object({
  address: Type.String({ minLength: 10 }),
  challenge: Type.String({ minLength: 10 }),
  proof: Type.String({ minLength: 10 }),
  captchaToken: Type.String({ minLength: 10 }),
});

export const AuthenticationResponse200 = Type.Object({
  success: Type.Boolean(),
  userId: Type.Integer(),
  accessToken: Type.String(),
});

export const AuthenticationResponseError = Type.Object({
  error: Type.String(),
  code: Type.String(),
});

export const RefreshTokenBody = Type.Null();

export const RefreshTokenResponse200 = Type.Object({
  success: Type.Boolean(),
  newToken: Type.String(),
});

export const RefreshTokenResponse401 = Type.Object({
  error: Type.String(),
});

export const ChallengeBody = Type.Object({
  address: Type.String({ description: 'User wallet address' }),
});

export const ChallengeResponse200 = Type.Object({
  challenge: Type.String(),
});

export const ChallengeErrorResponse = Type.Object({
  error: Type.String(),
  code: Type.Optional(Type.String()),
});
