import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  tokenId!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column({ name: 'usage_description' })
  usageDescription!: string;
}
