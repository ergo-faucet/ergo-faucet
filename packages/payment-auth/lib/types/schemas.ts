import { Static, Type } from '@sinclair/typebox';

export const checkStatusOrGetAddressBody = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
  authMethodId: Type.Number({ minimum: 0 }),
});

export type checkStatusOrGetAddressBodyType = Static<
  typeof checkStatusOrGetAddressBody
>;

export const CheckStatusOrGetAddressResponse200 = Type.Object({
  id: Type.Number(),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('passed'),
    Type.Literal('expired'),
    Type.Literal('failed'),
  ]),

  createdAt: Type.Number({ minimum: 1 }), // Address creation timestamp (seconds)

  modifiedAt: Type.Number({ minimum: 1 }), // Last update timestamp (seconds)

  verifiedAt: Type.Optional(Type.Number({ minimum: 1 })), // Timestamp when payment was verified

  config: Type.Optional(Type.String({ minLength: 1 })),

  address: Type.String({ minLength: 1 }),

  expiresTime: Type.Number({ minimum: 1 }), // Payment expiry timestamp (seconds)
});
