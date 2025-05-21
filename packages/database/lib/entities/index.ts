import { Asset } from './Asset';
import { AuthMethod } from './AuthMethod';
import { Package } from './Package';
import { PackageAuthMethod } from './PackageAuthMethod';
import { User } from './User';
import { UserAuthStatus } from './UserAuthStatus';
import { UserRequest } from './UserRequest';

export const entities = [
  Asset,
  AuthMethod,
  Package,
  PackageAuthMethod,
  User,
  UserAuthStatus,
  UserRequest,
];

export {
  Asset,
  AuthMethod,
  Package,
  PackageAuthMethod,
  User,
  UserAuthStatus,
  UserRequest,
};

export type Entities =
  | Asset
  | AuthMethod
  | Package
  | PackageAuthMethod
  | User
  | UserAuthStatus
  | UserRequest;

export type EntityClasses =
  | typeof Asset
  | typeof AuthMethod
  | typeof Package
  | typeof PackageAuthMethod
  | typeof User
  | typeof UserAuthStatus
  | typeof UserRequest;
