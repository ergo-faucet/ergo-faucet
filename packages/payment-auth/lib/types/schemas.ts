import { Type } from '@sinclair/typebox';

export const checkStatusOrGetAddressBody = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
  authMethodId: Type.Number({ minimum: 0 }),
});
