import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';
import { AuthMethod } from './AuthMethod';
import { Package } from './Package';

@Entity('user_auth_status_entity')
export class UserAuthStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn()
  user!: User;

  @ManyToOne(() => AuthMethod, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn()
  authMethod!: AuthMethod;

  @ManyToOne(() => Package, { lazy: true, nullable: false })
  @JoinColumn()
  package?: Package;

  @Column({ type: 'date' })
  verifiedAt!: Date;

  @Column({ type: 'text' })
  status!: 'passed' | 'failed' | 'pending';

  @Column({ type: 'date', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'text', nullable: true })
  authMetaData?: string;
}
