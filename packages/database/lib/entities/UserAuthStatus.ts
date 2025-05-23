import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';
import { AuthMethod } from './AuthMethod';
import { Package } from './Package';

@Entity('user_auth_status')
export class UserAuthStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => AuthMethod)
  authMethod!: AuthMethod;

  @ManyToOne(() => Package, { nullable: true })
  package?: Package;

  @Column({ name: 'verified_at', type: 'date' })
  verifiedAt!: Date;

  @Column({ type: 'text' })
  status!: 'passed' | 'failed' | 'pending';

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'auth_meta_data', type: 'text', nullable: true })
  authMetaData?: string;
}
