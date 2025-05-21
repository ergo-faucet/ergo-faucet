import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Package } from './Package';
import { AuthMethod } from './AuthMethod';

@Entity('package_auth_methods')
export class PackageAuthMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Package)
  package!: Package;

  @ManyToOne(() => AuthMethod)
  authMethod!: AuthMethod;

  @Column({ type: 'int' })
  order!: number;
}
