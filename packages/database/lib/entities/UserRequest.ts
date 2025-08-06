import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';
import { Package } from './Package';

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

  @Column({ type: 'date' })
  timestamp!: Date;

  @Column({ type: 'varchar' })
  destinationAddress!: string;

  @Column({ type: 'text' })
  status!: 'paid' | 'failed' | 'pending' | 'submitted';

  @Column({ type: 'text' })
  signedTx?: string;

  @Column({ type: 'int' })
  numberOfTries!: number;
}
