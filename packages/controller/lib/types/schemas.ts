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
  id: Type.Number(),
  tokenId: Type.String(),
  assetName: Type.String(),
  amount: Type.String(),
  usageDescription: Type.String(),
});

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
