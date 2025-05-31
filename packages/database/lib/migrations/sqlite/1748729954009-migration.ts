import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1748729954009 implements MigrationInterface {
  name = 'Migration1748729954009';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
                "package_id" integer,
                "auth_method_id" integer
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
                "package_id" integer
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_941e620c721dbd2ec1a03bdef3" ON "asset_entity" ("tokenId")
        `);
    await queryRunner.query(`
            CREATE TABLE "user_address_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "value" varchar NOT NULL,
                "user_id" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL)
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "authMetaData" text,
                "user_id" integer NOT NULL,
                "auth_method_id" integer NOT NULL,
                "package_id" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "user_id" integer,
                "package_id" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer NOT NULL,
                "package_id" integer,
                "auth_method_id" integer,
                CONSTRAINT "FK_9e692bd33c217783ebb6c027afb" FOREIGN KEY ("package_id") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_7fcb88864b51e24d07a912a0c68" FOREIGN KEY ("auth_method_id") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_package_auth_method_entity"("id", "order", "package_id", "auth_method_id")
            SELECT "id",
                "order",
                "package_id",
                "auth_method_id"
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
                "package_id" integer,
                CONSTRAINT "FK_38ec839e81d35bb2748d8152093" FOREIGN KEY ("package_id") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_asset_entity"(
                    "id",
                    "tokenId",
                    "amount",
                    "usageDescription",
                    "package_id"
                )
            SELECT "id",
                "tokenId",
                "amount",
                "usageDescription",
                "package_id"
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
            CREATE TABLE "temporary_user_address_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "value" varchar NOT NULL,
                "user_id" integer,
                CONSTRAINT "FK_cdd51042e29bcf208b3de5e06ed" FOREIGN KEY ("user_id") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_address_entity"("id", "value", "user_id")
            SELECT "id",
                "value",
                "user_id"
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
            CREATE TABLE "temporary_user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "authMetaData" text,
                "user_id" integer NOT NULL,
                "auth_method_id" integer NOT NULL,
                "package_id" integer,
                CONSTRAINT "FK_51088000d10159035652128ed98" FOREIGN KEY ("user_id") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_12f15867751aed20acb219e50e4" FOREIGN KEY ("auth_method_id") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f1fabd5104262e9a859e0a112c1" FOREIGN KEY ("package_id") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "authMetaData",
                    "user_id",
                    "auth_method_id",
                    "package_id"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "authMetaData",
                "user_id",
                "auth_method_id",
                "package_id"
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
            CREATE TABLE "temporary_user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "user_id" integer,
                "package_id" integer,
                CONSTRAINT "FK_71ff7a20d477cc2d43b1195d624" FOREIGN KEY ("user_id") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_f64f8fef102a948db0bf83cd5ae" FOREIGN KEY ("package_id") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_request_entity"(
                    "id",
                    "timestamp",
                    "destinationAddress",
                    "status",
                    "user_id",
                    "package_id"
                )
            SELECT "id",
                "timestamp",
                "destinationAddress",
                "status",
                "user_id",
                "package_id"
            FROM "user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_request_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_request_entity"
                RENAME TO "user_request_entity"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
                "user_id" integer,
                "package_id" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_request_entity"(
                    "id",
                    "timestamp",
                    "destinationAddress",
                    "status",
                    "user_id",
                    "package_id"
                )
            SELECT "id",
                "timestamp",
                "destinationAddress",
                "status",
                "user_id",
                "package_id"
            FROM "temporary_user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_request_entity"
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
                "user_id" integer NOT NULL,
                "auth_method_id" integer NOT NULL,
                "package_id" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "authMetaData",
                    "user_id",
                    "auth_method_id",
                    "package_id"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "authMetaData",
                "user_id",
                "auth_method_id",
                "package_id"
            FROM "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_address_entity"
                RENAME TO "temporary_user_address_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_address_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "value" varchar NOT NULL,
                "user_id" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_address_entity"("id", "value", "user_id")
            SELECT "id",
                "value",
                "user_id"
            FROM "temporary_user_address_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_address_entity"
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
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL,
                "package_id" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "asset_entity"(
                    "id",
                    "tokenId",
                    "amount",
                    "usageDescription",
                    "package_id"
                )
            SELECT "id",
                "tokenId",
                "amount",
                "usageDescription",
                "package_id"
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
                "package_id" integer,
                "auth_method_id" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "package_auth_method_entity"("id", "order", "package_id", "auth_method_id")
            SELECT "id",
                "order",
                "package_id",
                "auth_method_id"
            FROM "temporary_package_auth_method_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_package_auth_method_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_address_entity"
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
  }
}
