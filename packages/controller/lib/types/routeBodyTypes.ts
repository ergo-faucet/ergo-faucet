import { Static } from '@sinclair/typebox';
import {
  RequestPackageBody,
  AddPackageBody,
  AddAssetsToPackageBody,
  AddAuthMethodsToPackageBody,
} from '.';

export type RequestPackageBodyType = Static<typeof RequestPackageBody>;
export type AddPackageBodyType = Static<typeof AddPackageBody>;
export type AddAssetsToPackageBodyType = Static<typeof AddAssetsToPackageBody>;
export type AddAuthMethodsToPackageBodyType = Static<
  typeof AddAuthMethodsToPackageBody
>;
