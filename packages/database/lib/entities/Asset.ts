import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BigIntValueTransformer,
  Index,
} from '@rosen-bridge/extended-typeorm';

@Entity('asset_entity')
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  @Index()
  tokenId!: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  amount!: bigint;

  @Column({ type: 'text' })
  usageDescription!: string;
}
