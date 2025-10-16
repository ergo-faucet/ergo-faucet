import { Type } from '@sinclair/typebox';

export const PackagesRouteQuery = Type.Object({
  // offset and limit (pagination)
  offset: Type.Number({ minimum: 0, default: 0 }),
  limit: Type.Number({ minimum: 0, maximum: 100, default: 25 }),

  // asset filter
  asset_any: Type.Optional(Type.Array(Type.String({ minLength: 3 }))),
  asset_all: Type.Optional(Type.Array(Type.String({ minLength: 3 }))),

  // auth filter
  auth_any: Type.Optional(Type.Array(Type.Number({ minimum: 0 }))),
  auth_all: Type.Optional(Type.Array(Type.Number({ minimum: 0 }))),

  // time filter
  open_before: Type.Optional(Type.Number({ minimum: 0 })),
  open_after: Type.Optional(Type.Number({ minimum: 0 })),
  close_before: Type.Optional(Type.Number({ minimum: 0 })),
  close_after: Type.Optional(Type.Number({ minimum: 0 })),

  // search by pattern
  pattern: Type.Optional(Type.String()),

  // search by id
  id: Type.Optional(Type.Number({ minimum: 0 })),

  // sort and order
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
  tokenId: Type.String(),
  assetName: Type.String(),
  amount: Type.String({ pattern: '^[0-9]+(\\.[0-9]+)?$' }),
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
  delay: Type.String({ pattern: '^[0-9]+$' }),
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
export const RequsetHistoryRouteQuery = Type.Object({
  offset: Type.Number({ minimum: 0, default: 0 }),
  limit: Type.Number({ minimum: 0, maximum: 100, default: 25 }),
  sort: Type.Union([Type.Literal('timestamp'), Type.Literal('status')], {
    default: 'timestamp',
  }),
  order: Type.Union([Type.Literal('desc'), Type.Literal('asc')], {
    default: 'desc',
  }),
});

const RequestHistorySchema = Type.Object({
  requestId: Type.Number({ minimum: 0 }),
  packageId: Type.Number({ minimum: 0 }),
  packageName: Type.String(),
  status: Type.Union([
    Type.Literal('paid'),
    Type.Literal('failed'),
    Type.Literal('pending'),
    Type.Literal('submitted'),
  ]),
  timestamp: Type.Number(),
  destinationAddress: Type.String(),
  txId: Type.Optional(Type.String()),
});

export const GetRequestHistoryResponse200 = Type.Array(RequestHistorySchema);
