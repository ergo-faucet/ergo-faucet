import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from '@rosen-bridge/extended-typeorm';

@Entity('counter')
export class Counter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'count', type: 'int' })
  count!: number;
}
