import { Type } from '@sinclair/typebox';

export const AuthenticationBody = Type.Object({
  address: Type.String({ minLength: 10 }),
  challenge: Type.String({ minLength: 10 }),
  proof: Type.String({ minLength: 10 }),
  captchaToken: Type.String({ minLength: 10 }),
});

export const AuthenticationResponse200 = Type.Object({
  success: Type.Boolean(),
  payload: Type.Object({
    userId: Type.Number(),
    address: Type.String(),
    name: Type.Optional(Type.String()),
  }),
  accessToken: Type.String(),
});

export const RefreshTokenResponse200 = Type.Object({
  success: Type.Boolean(),
  newToken: Type.String(),
});

export const LogoutResponse200 = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

export const ErrorResponse = Type.Object({
  error: Type.String(),
  code: Type.String(),
});

export const ChallengeBody = Type.Object({
  changedAddress: Type.String(),
  addresses: Type.Array(Type.String(), {
    description: 'Set of user addresses',
    minItems: 1,
    uniqueItems: true,
  }),
});

export const ChallengeResponse200 = Type.Object({
  challenge: Type.String(),
  address: Type.String(),
});
