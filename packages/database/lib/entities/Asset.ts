import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('asset_entity')
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  tokenId!: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  amount!: bigint;

  @Column({ type: 'text' })
  usageDescription!: string;
}
