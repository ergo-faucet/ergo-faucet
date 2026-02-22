import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Relation,
} from '@rosen-bridge/extended-typeorm';

import { PackageAuthMethod } from './packageAuthMethod';
import { UserAuthStatus } from './userAuthStatus';

@Entity('auth_method_entity')
export class AuthMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  config!: string;

  @OneToMany(() => PackageAuthMethod, (pam) => pam.authMethod)
  packageAuthMethods!: Relation<PackageAuthMethod[]>;

  @OneToMany(() => UserAuthStatus, (status) => status.authMethod)
  userAuthStatuses!: Relation<UserAuthStatus[]>;

  @Column({ type: 'int' })
  createdAt!: number;

  @Column({ type: 'int' })
  modifiedAt!: number;
}
