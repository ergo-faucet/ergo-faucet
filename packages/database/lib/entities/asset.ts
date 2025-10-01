import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';

import { Package } from './package';

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

  @Column({ type: 'varchar', name: 'asset_name' })
  assetName!: string;

  @Column({ type: 'varchar' })
  amount!: string;

  @Column({ type: 'int' })
  decimals!: number;

  @Column({ type: 'text' })
  usageDescription!: string;

  @Column({ type: 'int' })
  createdAt!: number;

  @Column({ type: 'int' })
  modifiedAt!: number;
  
  @Column({ type: 'int', default: 10, nullable: true })
  weight!: number;
}
