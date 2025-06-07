import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';
import { Package } from './Package';

@Entity('user_request_entity')
export class UserRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  user!: User;

  @ManyToOne(() => Package, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  package!: Package;

  @Column({ type: 'date' })
  timestamp!: Date;

  @Column({ type: 'varchar' })
  destinationAddress!: string;

  @Column({ type: 'text' })
  status!: 'paid' | 'failed' | 'pending';
}
