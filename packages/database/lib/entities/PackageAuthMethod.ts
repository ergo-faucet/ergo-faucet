import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from '@rosen-bridge/extended-typeorm';
import { Package } from './Package';
import { AuthMethod } from './AuthMethod';

@Entity('package_auth_method_entity')
export class PackageAuthMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Package, { onDelete: 'CASCADE' })
  package!: Package;

  @ManyToOne(() => AuthMethod, { onDelete: 'CASCADE' })
  authMethod!: AuthMethod;

  @Column({ type: 'int' })
  order!: number;
}
