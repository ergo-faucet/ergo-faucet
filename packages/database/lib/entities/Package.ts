import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Relation,
  CreateDateColumn,
  UpdateDateColumn,
} from '@rosen-bridge/extended-typeorm';
import { Asset } from './Asset';
import { PackageAuthMethod } from './PackageAuthMethod';
import { UserAuthStatus } from './UserAuthStatus';
import { UserRequest } from './UserRequest';

@Entity('package_entity')
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', default: 'normal' })
  type!: 'normal' | 'random';

  @Column({ type: 'text', default: 'show' })
  status!: 'show' | 'hide';

  @Column({ name: 'open_at', type: 'int', nullable: true })
  openAt?: number;

  @Column({ name: 'close_at', type: 'int', nullable: true })
  closeAt?: number;

  @Column({ type: 'varchar', default: '0' })
  delay!: string;

  @Column({ name: 'number_each_user', type: 'int' })
  numberEachUser!: number;

  @OneToMany(() => Asset, (asset) => asset.package)
  assets!: Relation<Asset[]>;

  @OneToMany(() => PackageAuthMethod, (pam) => pam.package)
  packageAuthMethods!: Relation<PackageAuthMethod[]>;

  @OneToMany(() => UserAuthStatus, (status) => status.package)
  authStatuses!: Relation<UserAuthStatus[]>;

  @OneToMany(() => UserRequest, (request) => request.package)
  requests!: Relation<UserRequest[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'modified_at' })
  modifiedAt!: Date;
}
