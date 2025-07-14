import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1752495585030 implements MigrationInterface {
  name = 'Migration1752495585030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user_address_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "value" varchar NOT NULL,
                "userId" integer,
                CONSTRAINT "UQ_bbfe7dadd3cd07bbcc25b559ad1" UNIQUE ("value")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "lastLogin" date
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "authMetaData" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "config" text NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "package_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "type" text NOT NULL DEFAULT ('normal'),
                "status" text NOT NULL DEFAULT ('show'),
                "open_at" date,
                "close_at" date,
                "delay" bigint NOT NULL,
                "number_each_user" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "asset_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_941e620c721dbd2ec1a03bdef3" ON "asset_entity" ("tokenId")
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_user_address_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "value" varchar NOT NULL,
                "userId" integer,
                CONSTRAINT "UQ_bbfe7dadd3cd07bbcc25b559ad1" UNIQUE ("value"),
                CONSTRAINT "FK_8015306c9dd58bdfaf36a74d3f1" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_address_entity"("id", "value", "userId")
            SELECT "id",
                "value",
                "userId"
            FROM "user_address_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_address_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_address_entity"
                RENAME TO "user_address_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer,
                CONSTRAINT "FK_81e7a8f90b7f4b7e6d36c86aeea" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d1a8058eb7a3869b932f1905afd" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_request_entity"(
                    "id",
                    "timestamp",
                    "destinationAddress",
                    "status",
                    "userId",
                    "packageId"
                )
            SELECT "id",
                "timestamp",
                "destinationAddress",
                "status",
                "userId",
                "packageId"
            FROM "user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_request_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_request_entity"
                RENAME TO "user_request_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "authMetaData" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer NOT NULL,
                CONSTRAINT "FK_359a7061b1cce4191f212893715" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_1706f917d940b8559937eb33f8e" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "authMetaData",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "authMetaData",
                "userId",
                "authMethodId",
                "packageId"
            FROM "user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_auth_status_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_auth_status_entity"
                RENAME TO "user_auth_status_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order"),
                CONSTRAINT "FK_2626bb61c0eb6af245c70a6fb5b" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_c850da4a6db32f58d834e68ac57" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_package_auth_method_entity"("id", "order", "packageId", "authMethodId")
            SELECT "id",
                "order",
                "packageId",
                "authMethodId"
            FROM "package_auth_method_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "package_auth_method_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_package_auth_method_entity"
                RENAME TO "package_auth_method_entity"
        `);
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
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL,
                "packageId" integer
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
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
                RENAME TO "temporary_package_auth_method_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "package_auth_method_entity"("id", "order", "packageId", "authMethodId")
            SELECT "id",
                "order",
                "packageId",
                "authMethodId"
            FROM "temporary_package_auth_method_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_package_auth_method_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
                RENAME TO "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "authMetaData" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "authMetaData",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "authMetaData",
                "userId",
                "authMethodId",
                "packageId"
            FROM "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
                RENAME TO "temporary_user_request_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_request_entity"(
                    "id",
                    "timestamp",
                    "destinationAddress",
                    "status",
                    "userId",
                    "packageId"
                )
            SELECT "id",
                "timestamp",
                "destinationAddress",
                "status",
                "userId",
                "packageId"
            FROM "temporary_user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_request_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_address_entity"
                RENAME TO "temporary_user_address_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_address_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "value" varchar NOT NULL,
                "userId" integer,
                CONSTRAINT "UQ_bbfe7dadd3cd07bbcc25b559ad1" UNIQUE ("value")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_address_entity"("id", "value", "userId")
            SELECT "id",
                "value",
                "userId"
            FROM "temporary_user_address_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_address_entity"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_941e620c721dbd2ec1a03bdef3"
        `);
    await queryRunner.query(`
            DROP TABLE "asset_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "package_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "package_auth_method_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "auth_method_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_address_entity"
        `);
  }
}
