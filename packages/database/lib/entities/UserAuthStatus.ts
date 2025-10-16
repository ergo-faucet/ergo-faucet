import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';
import { AuthMethod } from './AuthMethod';
import { Package } from './Package';

@Entity('user_auth_status_entity')
export class UserAuthStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.authStatuses, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  user!: Relation<User>;

  @ManyToOne(() => AuthMethod, (method) => method.userAuthStatuses, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  authMethod!: Relation<AuthMethod>;

  @ManyToOne(() => Package, (pkg) => pkg.authStatuses, { nullable: true })
  @JoinColumn()
  package?: Relation<Package>;

  @Column({ type: 'date' })
  verifiedAt!: Date;

  @Column({ type: 'text' })
  status!: 'passed' | 'failed' | 'pending' | 'expired';

  @Column({ type: 'date', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: {
    token?: string;
    refresh_token?: string;
  };

  @Column({ type: 'int' })
  createdAt!: number;

  @Column({ type: 'int' })
  modifiedAt!: number;
}
