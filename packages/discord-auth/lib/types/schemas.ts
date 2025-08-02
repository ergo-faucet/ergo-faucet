import { Static, Type } from '@sinclair/typebox';

export const CallBackRouteResponse200 = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

export const ErrorResponse = Type.Object({
  error: Type.String(),
});

export const CallBackRouteQuery = Type.Object({
  code: Type.String({ minLength: 10 }),
});
export type CallBackRouteQueryType = Static<typeof CallBackRouteQuery>;
