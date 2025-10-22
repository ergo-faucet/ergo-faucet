import { Entity, PrimaryColumn } from '@rosen-bridge/extended-typeorm';

@Entity('counter')
export class Counter {
  @PrimaryColumn({ name: 'count', type: 'int' })
  count!: number;
}
