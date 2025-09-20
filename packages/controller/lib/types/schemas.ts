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

export const AssetSchema = Type.Object({
  //  id: Type.Number(),
  tokenId: Type.String(),
  assetName: Type.String(),
  amount: Type.String(),
  decimals: Type.Number({ minimum: 0 }),
  usageDescription: Type.Optional(Type.String()),
});

export const UserProvidedAsset = Type.Omit(AssetSchema, [
  'decimals',
  'assetName',
]);

export const AuthMethodSchema = Type.Object({
  id: Type.Number({ minimum: 0 }),
  name: Type.String({ minLength: 1 }),
  status: Type.Optional(
    Type.Union([
      Type.Literal('pending'),
      Type.Literal('passed'),
      Type.Literal('failed'),
      Type.Literal('expired'),
    ]),
  ),
});

export const PackageSchema = Type.Object({
  id: Type.Number({ minimum: 0 }),
  name: Type.String(),
  description: Type.String(),
  type: Type.Union([Type.Literal('normal'), Type.Literal('random')]),
  openAt: Type.Optional(Type.Number()),
  closeAt: Type.Optional(Type.Number()),
  delay: Type.String(),
  numberEachUser: Type.Number({ minimum: 0 }),
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

export const RequestPackageResponse200 = Type.Object({
  requestId: Type.Number({ minimum: 1 }),
});

export const AddPackageBody = Type.Object({
  name: Type.String(),
  description: Type.String(),
  type: Type.Union([Type.Literal('normal'), Type.Literal('random')]),
  status: Type.Union([Type.Literal('show'), Type.Literal('hide')]),
  openAt: Type.Optional(Type.Number({ minimum: 0 })),
  closeAt: Type.Optional(Type.Number({ minimum: 0 })),
  delay: Type.String(),
  numberEachUser: Type.Number({ minimum: 1 }),
});

export const AddPackageResponse200 = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
});

export const UpdatePackageParams = Type.Object({
  packageId: Type.Number({ minimum: 0 }),
});

export const AddAssetsToPackageBody = Type.Array(UserProvidedAsset);

export const AddAssetsToPackageResponse200 = Type.Object({
  addedAssets: Type.Array(Type.Number({ minimum: 0 })),
});

export const AddAuthMethodsToPackageBody = Type.Array(
  Type.Object({
    id: Type.Number({ minimum: 0 }),
    order: Type.Optional(Type.Number({ minimum: 0 })),
  }),
);

export const AddAuthMethodsToPackageResponse200 = Type.Object({
  addedAuthIds: Type.Array(Type.Number({ minimum: 0 })),
});
