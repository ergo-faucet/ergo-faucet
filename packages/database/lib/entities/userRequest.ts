import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';

import { Package } from './package';
import { User } from './user';

@Entity('user_request_entity')
export class UserRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.requests, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn()
  user!: Relation<User>;

  @ManyToOne(() => Package, (pkg) => pkg.requests, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn()
  package!: Relation<Package>;

  @Column({ type: 'varchar' })
  destinationAddress!: string;

  @Column({ type: 'text' })
  status!: 'paid' | 'failed' | 'pending' | 'submitted';

  @Column({ type: 'text', nullable: true })
  txId!: string | null;

  @Column({ name: 'signed_tx', type: 'text', nullable: true })
  txSerialized!: string | null;

  @Column({ name: 'creationHeight', type: 'int', nullable: true })
  creationHeight!: number;

  @Column({ type: 'int', default: 0 })
  numberOfTries!: number;

  @Column({ type: 'int' })
  createdAt!: number;

  @Column({ type: 'int' })
  modifiedAt!: number;
}
