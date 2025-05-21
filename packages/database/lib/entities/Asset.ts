import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  @Index({ unique: true })
  tokenId!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ type: 'text' })
  usageDescription!: string;
}
