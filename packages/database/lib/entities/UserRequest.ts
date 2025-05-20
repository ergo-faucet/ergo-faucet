import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './User';
import { Package } from './Package';

@Entity('user_requests')
export class UserRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Package)
  package!: Package;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ name: 'destination_address' })
  destinationAddress!: string;

  @Column({ type: 'enum', enum: ['paid', 'failed', 'pending'] })
  status!: 'paid' | 'failed' | 'pending';
}
