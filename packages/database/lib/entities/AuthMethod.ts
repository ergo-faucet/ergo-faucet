import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from '@rosen-bridge/extended-typeorm';
import { PackageAuthMethod } from './PackageAuthMethod';

@Entity('auth_method_entity')
export class AuthMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToMany(() => PackageAuthMethod, (pam) => pam.authMethod)
  packages!: PackageAuthMethod[];

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  config!: string;
}
