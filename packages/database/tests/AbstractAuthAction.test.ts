import { beforeEach, describe, expect, it } from 'vitest';
import sqliteDataSource from '../lib/migrationDataSource/sqliteDataSource';
import { User, UserAuthStatus, AuthMethod } from '../lib/entities';
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import { AbstractAuthAction } from '../lib/actions/AbstractAuthAction';
import { DataSource } from '@rosen-bridge/extended-typeorm';

/**
 * Test implementation of AbstractAuthAction for testing purposes
 */
class TestAuthAction extends AbstractAuthAction {
  readonly authMethodName = 'test-auth';

  constructor(dataSource: DataSource, logger?: DummyLogger) {
    super(dataSource, logger);
  }
}

describe('AbstractAuthAction expire methods with real DB', () => {
  let action: TestAuthAction;
  let authMethod: AuthMethod;

  beforeEach(async () => {
    if (sqliteDataSource.isInitialized) {
      await sqliteDataSource.destroy();
    }
    await sqliteDataSource.initialize();
    await sqliteDataSource.synchronize(true);

    action = new TestAuthAction(sqliteDataSource, new DummyLogger());

    const authRepo = sqliteDataSource.getRepository(AuthMethod);
    authMethod = await authRepo.save({
      name: 'test-auth',
      config: '{}',
      createdAt: 2000,
      modifiedAt: 2000,
    });
    (action as unknown as { authMethod: AuthMethod }).authMethod = authMethod;
  });

  /**
   * Test for expiring only auth records that are past their expiry
   * @target AbstractAuthAction.expireAllExpiredAuths
   * @scenario
   * - create 3 users with auth records:
   *   - 2 expired (yesterday, 2 days ago)
   *   - 1 still valid (tomorrow)
   * - call expireAllExpiredAuths
   * @expected
   * - expired records should have status 'expired' and cleared tokens
   * - valid record should remain unchanged
   */
  it('should expire only records that are past their expiry', async () => {
    const userRepo = sqliteDataSource.getRepository(User);
    const statusRepo = sqliteDataSource.getRepository(UserAuthStatus);

    // Create test users
    const u1 = await userRepo.save({
      name: 'u1',
      createdAt: 2000,
      modifiedAt: 2000,
    } as User);
    const u2 = await userRepo.save({
      name: 'u2',
      createdAt: 2000,
      modifiedAt: 2000,
    } as User);
    const u3 = await userRepo.save({
      name: 'u3',
      createdAt: 2000,
      modifiedAt: 2000,
    } as User);

    // Create test auth records
    await statusRepo.save([
      {
        user: u1,
        authMethod,
        status: 'passed',
        verifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        metadata: { token: 't1', refresh_token: 'r1' },
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        createdAt: 2000,
        modifiedAt: 2000,
      },
      {
        user: u2,
        authMethod,
        status: 'passed',
        verifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        metadata: { token: 't2', refresh_token: 'r2' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        createdAt: 2000,
        modifiedAt: 2000,
      },
      {
        user: u3,
        authMethod,
        status: 'passed',
        verifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        metadata: { token: 't3', refresh_token: 'r3' },
        expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        createdAt: 2000,
        modifiedAt: 2000,
      },
    ]);

    await action.expireAllExpiredAuths();

    const updated = await statusRepo.find({ relations: ['user'] });

    const expired = updated.filter((r) => r.status === 'expired');
    const stillValid = updated.filter((r) => r.status === 'passed');

    // Verify expired users
    expect(expired.map((r) => r.user.id).sort()).toEqual([u1.id, u3.id].sort());
    // Verify valid user
    expect(stillValid.map((r) => r.user.id)).toEqual([u2.id]);

    // Tokens cleared for expired records
    expect(
      expired.every(
        (r) => r.metadata.token === '' && r.metadata.refresh_token === '',
      ),
    ).toBe(true);
  });
});
