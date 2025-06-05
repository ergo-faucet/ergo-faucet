import {
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
} from '@rosen-bridge/extended-typeorm';
import { UserAddress } from './UserAddress';

@Entity('user_entity')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToMany(() => UserAddress, (address) => address.user, {
    cascade: true,
    lazy: true,
  })
  addresses!: Promise<UserAddress[]>;
}
