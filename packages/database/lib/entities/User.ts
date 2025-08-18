import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { UserAddress } from './UserAddress';
import { UserAuthStatus } from './UserAuthStatus';
import { UserRequest } from './UserRequest';

@Entity('ity')
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
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  discord_id!: string;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  x_id!: string;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  google_id!: string;

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
    google?: {
      name?: string;
      email?: string;
    };
  };

  @Column({ type: 'bigint', nullable: true })
  lastLogin!: number | null;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;
}
