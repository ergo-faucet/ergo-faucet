import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Asset } from './Asset';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Asset)
  asset!: Asset;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ type: 'enum', enum: ['normal', 'random'] })
  type!: 'normal' | 'random';

  @Column({ type: 'enum', enum: ['show', 'hide'] })
  status!: 'show' | 'hide';

  @Column({ name: 'open_at', type: 'timestamp', nullable: true })
  openAt?: Date;

  @Column({ name: 'close_at', type: 'timestamp', nullable: true })
  closeAt?: Date;

  @Column()
  delay!: number;

  @Column({ name: 'number_each_user' })
  numberEachUser!: number;
}
