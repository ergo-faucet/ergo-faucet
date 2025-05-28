import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';

@Entity('user_address_entity')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  value!: string;
}
