import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BigIntValueTransformer,
  Index,
  ManyToOne,
  JoinColumn,
} from '@rosen-bridge/extended-typeorm';
import { Package } from './Package';

@Entity('asset_entity')
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Package, { lazy: true })
  @JoinColumn()
  package!: Promise<Package>;

  @Column({ type: 'varchar' })
  @Index()
  tokenId!: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  amount!: bigint;

  @Column({ type: 'text' })
  usageDescription!: string;
}
