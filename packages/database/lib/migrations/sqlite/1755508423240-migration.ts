import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1755508423240 implements MigrationInterface {
  name = 'Migration1755508423240';

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
    await queryRunner.query(`
            CREATE TABLE "temporary_user_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "discord_id" varchar,
                "x_id" varchar,
                "google_id" varchar,
                "name" varchar,
                "metadata" text,
                "lastLogin" bigint,
                "isAdmin" boolean NOT NULL DEFAULT (0),
                CONSTRAINT "UQ_85e382b226c35988718a4b5899d" UNIQUE ("google_id"),
                CONSTRAINT "UQ_c90663850593629f210649c7891" UNIQUE ("x_id"),
                CONSTRAINT "UQ_d21d8b1697402c5288441fe9322" UNIQUE ("discord_id")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_entity"(
                    "id",
                    "discord_id",
                    "x_id",
                    "google_id",
                    "name",
                    "metadata",
                    "lastLogin"
                )
            SELECT "id",
                "discord_id",
                "x_id",
                "google_id",
                "name",
                "metadata",
                "lastLogin"
            FROM "user_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_entity"
                RENAME TO "user_entity"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_entity"
                RENAME TO "temporary_user_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "discord_id" varchar,
                "x_id" varchar,
                "google_id" varchar,
                "name" varchar,
                "metadata" text,
                "lastLogin" bigint,
                CONSTRAINT "UQ_85e382b226c35988718a4b5899d" UNIQUE ("google_id"),
                CONSTRAINT "UQ_c90663850593629f210649c7891" UNIQUE ("x_id"),
                CONSTRAINT "UQ_d21d8b1697402c5288441fe9322" UNIQUE ("discord_id")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_entity"(
                    "id",
                    "discord_id",
                    "x_id",
                    "google_id",
                    "name",
                    "metadata",
                    "lastLogin"
                )
            SELECT "id",
                "discord_id",
                "x_id",
                "google_id",
                "name",
                "metadata",
                "lastLogin"
            FROM "temporary_user_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_entity"
        `);
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
