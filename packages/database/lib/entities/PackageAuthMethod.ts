import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { Package } from './Package';
import { AuthMethod } from './AuthMethod';

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

  @Column({ type: 'int' })
  order!: number;
}
