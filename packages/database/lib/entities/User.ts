import {
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { UserAddress } from './UserAddress';
import { UserAuthStatus } from './UserAuthStatus';
import { UserRequest } from './UserRequest';

@Entity('user_entity')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToMany(() => UserAddress, (address) => address.user)
  addresses!: Relation<UserAddress[]>;

  @OneToMany(() => UserAuthStatus, (status) => status.user)
  authStatuses!: Relation<UserAuthStatus[]>;

  @OneToMany(() => UserRequest, (request) => request.user)
  requests!: Relation<UserRequest[]>;
}
