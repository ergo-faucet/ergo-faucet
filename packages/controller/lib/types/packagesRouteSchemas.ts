import { Type } from '@sinclair/typebox';

export const PackagesRouteQuery = Type.Object({
  offset: Type.Number({ minimum: 0, default: 0 }),
  limit: Type.Number({ minimum: 0, maximum: 100, default: 25 }),
  sort: Type.Union([Type.Literal('release'), Type.Literal('name')], {
    default: 'release',
  }),
  order: Type.Union([Type.Literal('desc'), Type.Literal('asc')], {
    default: 'desc',
  }),
});

const AssetSchema = Type.Object({
  id: Type.Number(),
  tokenId: Type.String(),
  amount: Type.String(),
  usageDescription: Type.String(),
});

const AuthMethodSchema = Type.Object({
  id: Type.Number({ minimum: 0 }),
  name: Type.String({ minLength: 1 }),
});

const PackageSchema = Type.Object({
  id: Type.Number({ minimum: 0 }),
  name: Type.String(),
  description: Type.String(),
  type: Type.Union([Type.Literal('normal'), Type.Literal('random')]),
  openAt: Type.Optional(Type.String({ format: 'date-time' })),
  closeAt: Type.Optional(Type.String({ format: 'date-time' })),
  delay: Type.Number(),
  numberEachUser: Type.Number({ minimum: 0 }),
  assets: Type.Array(AssetSchema),
  authMethods: Type.Array(AuthMethodSchema),
});

export const GetPackagesResponse200 = Type.Array(PackageSchema);

export const GetPackageErrorResponse = Type.Object({
  error: Type.String(),
  code: Type.String(),
});
