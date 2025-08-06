import {
  BigIntValueTransformer,
  Column,
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

  @Column({
    type: 'bigint',
    nullable: true,
    unique: true,
    transformer: new BigIntValueTransformer(),
  })
  discord_id!: string;

  @Column({
    type: 'bigint',
    nullable: true,
    unique: true,
    transformer: new BigIntValueTransformer(),
  })
  x_id!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: {
    discord?: {
      name?: string;
      username?: string;
      email?: string;
      join_date?: Date;
    };
    x?: {
      name?: string;
      username?: string;
      join_date?: Date;
    };
  };

  @Column({ type: 'bigint', nullable: true })
  lastLogin!: number | null;
}
