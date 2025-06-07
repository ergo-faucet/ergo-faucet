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
  @JoinColumn()
  package!: Package;

  @ManyToOne(() => AuthMethod, { onDelete: 'CASCADE' })
  @JoinColumn()
  authMethod!: AuthMethod;

  @Column({ type: 'int' })
  order!: number;
}
