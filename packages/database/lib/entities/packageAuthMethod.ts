import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Relation,
} from '@rosen-bridge/extended-typeorm';

import { AuthMethod } from './authMethod';
import { Package } from './package';

@Entity('package_auth_method_entity')
@Unique(['package', 'authMethod', 'order'])
export class PackageAuthMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Package, (pkg) => pkg.packageAuthMethods, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  package!: Relation<Package>;

  @ManyToOne(() => AuthMethod, (method) => method.packageAuthMethods, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  authMethod!: Relation<AuthMethod>;

  @Column({ type: 'int', nullable: true })
  order!: number;

  @Column({ type: 'int' })
  createdAt!: number;

  @Column({ type: 'int' })
  modifiedAt!: number;
}
