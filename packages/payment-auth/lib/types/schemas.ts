import { Type } from '@sinclair/typebox';

export const getAddressParam = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
});
