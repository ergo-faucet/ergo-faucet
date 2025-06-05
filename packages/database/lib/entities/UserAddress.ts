import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';

@Entity('user_address_entity')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.addresses, {
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn()
  user!: Promise<User>;

  @Column({ type: 'varchar' })
  value!: string;
}
