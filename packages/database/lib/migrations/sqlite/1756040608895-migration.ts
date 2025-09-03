import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1756040608895 implements MigrationInterface {
  name = 'Migration1756040608895';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "IDX_941e620c721dbd2ec1a03bdef3"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_asset_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL,
                "packageId" integer,
                CONSTRAINT "FK_dc2ee4d919892ecaad131a176e5" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_asset_entity"(
                    "id",
                    "tokenId",
                    "amount",
                    "usageDescription",
                    "packageId"
                )
            SELECT "id",
                "tokenId",
                "amount",
                "usageDescription",
                "packageId"
            FROM "asset_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "asset_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_asset_entity"
                RENAME TO "asset_entity"
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_941e620c721dbd2ec1a03bdef3" ON "asset_entity" ("tokenId")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "IDX_941e620c721dbd2ec1a03bdef3"
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity"
                RENAME TO "temporary_asset_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "asset_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "isNative" boolean NOT NULL DEFAULT (0),
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL,
                "packageId" integer,
                CONSTRAINT "FK_dc2ee4d919892ecaad131a176e5" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "asset_entity"(
                    "id",
                    "tokenId",
                    "amount",
                    "usageDescription",
                    "packageId"
                )
            SELECT "id",
                "tokenId",
                "amount",
                "usageDescription",
                "packageId"
            FROM "temporary_asset_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_asset_entity"
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_941e620c721dbd2ec1a03bdef3" ON "asset_entity" ("tokenId")
        `);
  }
}
