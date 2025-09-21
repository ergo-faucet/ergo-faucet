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

export const LoginRouteQuery = Type.Object({
  state: Type.Optional(Type.String()),
});
export type LoginRouteQueryType = Static<typeof LoginRouteQuery>;

export const LoginRouteResponse200 = Type.Object({
  redirectURL: Type.String(),
});
