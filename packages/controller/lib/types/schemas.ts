import { Type } from '@sinclair/typebox';

export const PackagesRouteQuery = Type.Object({
  offset: Type.Number({ minimum: 0, default: 0 }),
  limit: Type.Number({ minimum: 0, maximum: 100, default: 25 }),
  sort: Type.Union(
    [
      Type.Literal('id'),
      Type.Literal('closeAt'),
      Type.Literal('openAt'),
      Type.Literal('name'),
    ],
    {
      default: 'id',
    },
  ),
  order: Type.Union([Type.Literal('desc'), Type.Literal('asc')], {
    default: 'desc',
  }),
});

const AssetSchema = Type.Object({
  tokenId: Type.String(),
  amount: Type.String(),
  decimals: Type.Number({ minimum: 0 }),
  usageDescription: Type.String(),
});

export const UserProvidedAsset = Type.Omit(AssetSchema, ['decimals']);

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
  numberEachUser: Type.Number({ minimum: 1 }),
  assets: Type.Array(AssetSchema),
  authMethods: Type.Array(AuthMethodSchema),
});

export const GetPackagesResponse200 = Type.Array(PackageSchema);

export const ErrorResponse = Type.Object({
  error: Type.String(),
  code: Type.String(),
});

export const RequestPackageBody = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
  destAddress: Type.String({ minLength: 1 }),
  captchaToken: Type.String({ minLength: 1 }),
});

export const AddPackageBody = Type.Object({
  name: Type.String(),
  description: Type.String(),
  type: Type.Union([Type.Literal('normal'), Type.Literal('random')]),
  status: Type.Union([Type.Literal('show'), Type.Literal('hide')]),
  openAt: Type.Optional(Type.String({ format: 'date-time' })),
  closeAt: Type.Optional(Type.String({ format: 'date-time' })),
  delay: Type.Number(),
  numberEachUser: Type.Number({ minimum: 1 }),
  assets: Type.Array(UserProvidedAsset),
  authMethods: Type.Array(
    Type.Object({
      id: Type.Number({ minimum: 0 }),
      order: Type.Optional(Type.Number({ minimum: 0 })),
    }),
  ),
});

export const AddPackageResponse200 = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
});

export const RequestPackageResponse200 = Type.Object({
  requestId: Type.Number({ minimum: 1 }),
});
