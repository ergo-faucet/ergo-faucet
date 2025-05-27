import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from '@rosen-bridge/extended-typeorm';

@Entity('user_entity')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('simple-array')
  addresses!: string[];
}
