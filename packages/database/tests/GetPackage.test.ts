import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sqliteDataSource from '../lib/migrationDataSource/sqliteDataSource';
import {
  Package,
  PackageAuthMethod,
  User,
  UserAuthStatus,
  Asset,
  AuthMethod,
} from '../lib/entities';
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import { PackageAction } from '../lib/actions/PackageAction';
import { mockPackages } from './mockData';

describe('PackageAction.getPackages with mock data', () => {
  let action: PackageAction;
  let user: User;
  let savedPackages: { pkg: Package; mock: (typeof mockPackages)[number] }[] =
    [];

  afterAll(async () => {
    if (sqliteDataSource.isInitialized) {
      await sqliteDataSource.destroy();
    }
  });
  beforeAll(async () => {
    if (sqliteDataSource.isInitialized) {
      await sqliteDataSource.destroy();
    }
    await sqliteDataSource.initialize();
    await sqliteDataSource.synchronize(true);

    // Initialize singleton once
    PackageAction.initialize(sqliteDataSource, new DummyLogger());
    action = PackageAction.getInstance();
  });

  beforeEach(async () => {
    await sqliteDataSource.synchronize(true);

    const userRepo = sqliteDataSource.getRepository(User);
    user = await userRepo.save({
      name: 'test-user',
      createdAt: 2000,
      modifiedAt: 2000,
    } as User);

    const pkgRepo = sqliteDataSource.getRepository(Package);
    const authRepo = sqliteDataSource.getRepository(AuthMethod);
    const pamRepo = sqliteDataSource.getRepository(PackageAuthMethod);
    const assetRepo = sqliteDataSource.getRepository(Asset);
    const statusRepo = sqliteDataSource.getRepository(UserAuthStatus);

    savedPackages = [];
    for (const pkgMock of mockPackages) {
      const pkg = await pkgRepo.save({
        name: pkgMock.name,
        description: pkgMock.description,
        type: pkgMock.type,
        status: 'show',
        delay: pkgMock.delay,
        numberEachUser: pkgMock.numberEachUser,
        createdAt: 2000,
        modifiedAt: 2000,
      });

      savedPackages.push({ pkg, mock: pkgMock });

      for (const a of pkgMock.assets) {
        await assetRepo.save({
          package: pkg,
          tokenId: a.tokenId,
          assetName: a.assetName,
          amount: a.amount,
          decimals: 0,
          usageDescription: a.usageDescription,
          createdAt: 2000,
          modifiedAt: 2000,
        });
      }

      let orderCounter = 1;
      for (const am of pkgMock.authMethods) {
        let authMethod = await authRepo.findOne({ where: { name: am.name } });
        if (!authMethod) {
          authMethod = await authRepo.save({
            name: am.name,
            config: {},
            createdAt: 2000,
            modifiedAt: 2000,
          });
        }

        await pamRepo.save({
          package: pkg,
          authMethod,
          order: orderCounter++,
          createdAt: 2000,
          modifiedAt: 2000,
        });

        if (am.status) {
          await statusRepo.save({
            user,
            authMethod,
            package: pkg,
            status: am.status,
            verifiedAt: Math.floor(Date.now() / 1000),
            metadata: { token: 'dummy', refresh_token: 'dummy' },
            createdAt: 2000,
            modifiedAt: 2000,
          });
        }
      }
    }
  });

  /**
   * Test for fetching all packages with assets and user-specific auth status
   * @target PackageAction.getPackages
   * @scenario
   * - Create packages with assets and different auth methods
   * - Assign user-specific statuses for some auth methods
   * - Call getPackages with userId
   * @expected
   * - Returned packages should match mock data
   * - Each package contains correct assets
   * - Each package contains correct authMethods with user status applied
   */
  it('should fetch all packages with assets and user-specific auth status', async () => {
    const result = await action.getPackages(0, 10, 'id', 'asc', {}, user.id);

    expect(result).toHaveLength(savedPackages.length);

    for (const { pkg, mock } of savedPackages) {
      const pkgDTO = result.find((p) => p.id === pkg.id);
      expect(pkgDTO).toBeDefined();
      expect(pkgDTO!.name).toBe(mock.name);

      expect(pkgDTO!.assets).toHaveLength(mock.assets.length);
      for (const assetMock of mock.assets) {
        const assetDTO = pkgDTO!.assets.find(
          (a) => a.tokenId === assetMock.tokenId,
        );
        expect(assetDTO).toBeDefined();
        expect(assetDTO!.amount).toBe(assetMock.amount);
      }

      expect(pkgDTO!.authMethods).toHaveLength(mock.authMethods.length);
      for (const amMock of mock.authMethods) {
        const amDTO = pkgDTO!.authMethods.find((a) => a.name === amMock.name);
        expect(amDTO).toBeDefined();
        if (amMock.status) {
          expect(amDTO!.status).toBe(amMock.status);
        } else {
          expect(amDTO!.status).toBeUndefined();
        }
      }
    }
  });

  /**
   * Test for fetching packages without userId
   * @target PackageAction.getPackages
   * @scenario
   * - Call getPackages without passing userId
   * @expected
   * - Returned packages should still include assets and authMethods
   * - All authMethods should have undefined status
   */
  it('should fetch packages without userId (all statuses undefined)', async () => {
    const result = await action.getPackages(0, 10, 'id', 'asc', {});

    expect(result).toHaveLength(savedPackages.length);
    for (const pkg of result) {
      for (const am of pkg.authMethods) {
        expect(am.status).toBeUndefined();
      }
    }
  });

  /**
   * Test for pagination with limit and offset
   * @target PackageAction.getPackages
   * @scenario
   * - Request with offset=1 and limit=1
   * @expected
   * - Only one package should be returned
   * - Returned package should be the second one in savedPackages
   */
  it('should fetch packages with limit and offset', async () => {
    const result = await action.getPackages(1, 1, 'id', 'asc', {}, user.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(savedPackages[1].pkg.id);
  });

  /**
   * Test for sorting packages by id in descending order
   * @target PackageAction.getPackages
   * @scenario
   * - Request with sort='id' and order='desc'
   * @expected
   * - Returned package IDs should match savedPackages sorted descending
   */
  it('should fetch packages sorted by id desc', async () => {
    const result = await action.getPackages(0, 10, 'id', 'desc', {}, user.id);

    const sortedIds = [...savedPackages.map((s) => s.pkg.id)].sort(
      (a, b) => b - a,
    );
    const resultIds = result.map((p) => p.id);
    expect(resultIds).toEqual(sortedIds);
  });
});
