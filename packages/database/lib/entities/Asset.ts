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

  @ManyToOne(() => Package, (pkg) => pkg.assets)
  @JoinColumn({ name: 'package_id' })
  package!: Package;

  @Column({ type: 'varchar' })
  @Index()
  tokenId!: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  amount!: bigint;

  @Column({ type: 'text' })
  usageDescription!: string;
}
