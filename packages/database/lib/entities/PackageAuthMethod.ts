import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from '@rosen-bridge/extended-typeorm';
import { Package } from './Package';
import { AuthMethod } from './AuthMethod';

@Entity('package_auth_method_entity')
@Unique(['package', 'authMethod', 'order'])
export class PackageAuthMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Package, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package!: Package;

  @ManyToOne(() => AuthMethod, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auth_method_id' })
  authMethod!: AuthMethod;

  @Column({ type: 'int' })
  order!: number;
}
