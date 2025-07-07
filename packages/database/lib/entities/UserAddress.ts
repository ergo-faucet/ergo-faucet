import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from '@rosen-bridge/extended-typeorm';
import { User } from './User';

@Entity('user_address_entity')
@Unique(['value'])
export class UserAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: Relation<User>;

  @Column({ type: 'varchar' })
  value!: string;
}
