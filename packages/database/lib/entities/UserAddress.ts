import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';

@Entity('user_address_entity')
@Unique(['value'])
export class UserAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @Column({ type: 'varchar' })
  value!: string;
}
