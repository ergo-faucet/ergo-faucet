import { Static, Type } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({
  error: Type.String(),
  code: Type.String(),
});

export const CallBackRouteQuery = Type.Object({
  code: Type.String({ minLength: 10 }),
  state: Type.String({ minLength: 10 }),
});
export type CallBackRouteQueryType = Static<typeof CallBackRouteQuery>;
