import { Type } from '@sinclair/typebox';

export const checkStatusOrGetAddressBody = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
  authMethodId: Type.Number({ minimum: 0 }),
});

export const CheckStatusOrGetAddressResponse200 = Type.Object({
  id: Type.Number(),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('passed'),
    Type.Literal('expired'),
    Type.Literal('failed'),
  ]),
  verifiedAt: Type.String(),

  config: Type.Optional(Type.String()),
  address: Type.String(),
});
