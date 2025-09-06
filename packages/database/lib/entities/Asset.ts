import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BigIntValueTransformer,
  Index,
  ManyToOne,
  JoinColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { Package } from './Package';

@Entity('asset_entity')
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Package, (pkg) => pkg.assets)
  @JoinColumn()
  package!: Relation<Package>;

  @Column({ type: 'varchar' })
  @Index()
  tokenId!: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  amount!: bigint;

  @Column({ type: 'int' })
  decimals!: number;

  @Column({ type: 'text' })
  usageDescription!: string;
}
