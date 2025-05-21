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

  @Column({ type: 'date' })
  timestamp!: Date;

  @Column({ name: 'destination_address', type: 'varchar' })
  destinationAddress!: string;

  @Column({ type: 'text' })
  status!: 'paid' | 'failed' | 'pending';
}
