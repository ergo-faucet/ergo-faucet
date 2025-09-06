import { Static } from '@sinclair/typebox';
import { RequestPackageBody, AddPackageBody } from '.';

export type RequestPackageBodyType = Static<typeof RequestPackageBody>;
export type AddPackageBodyType = Static<typeof AddPackageBody>;
