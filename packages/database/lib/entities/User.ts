import { Entity, PrimaryGeneratedColumn } from '@rosen-bridge/extended-typeorm';

@Entity('user_entity')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;
}
