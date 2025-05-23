import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from '@rosen-bridge/extended-typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('simple-array')
  addresses!: string[];
}
