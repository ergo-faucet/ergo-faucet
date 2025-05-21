import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('auth_methods')
export class AuthMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  config!: string;
}
