import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from '@rosen-bridge/extended-typeorm';
import { Asset } from './Asset';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  asset!: Asset;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', default: 'normal' })
  type!: 'normal' | 'random';

  @Column({ type: 'text', default: 'show' })
  status!: 'show' | 'hide';

  @Column({ name: 'open_at', type: 'date', nullable: true })
  openAt?: Date;

  @Column({ name: 'close_at', type: 'date', nullable: true })
  closeAt?: Date;

  @Column({ type: 'bigint' })
  delay!: number;

  @Column({ name: 'number_each_user', type: 'int' })
  numberEachUser!: number;
}
