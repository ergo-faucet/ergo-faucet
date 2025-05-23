import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1747851918422 implements MigrationInterface {
  name = 'Migration1747851918422';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "assets" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_8eb9150ab77f3c0bc042b83719" ON "assets" ("tokenId")
        `);
    await queryRunner.query(`
            CREATE TABLE "auth_methods" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "config" text NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "packages" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "type" text NOT NULL DEFAULT ('normal'),
                "status" text NOT NULL DEFAULT ('show'),
                "open_at" date,
                "close_at" date,
                "delay" bigint NOT NULL,
                "number_each_user" integer NOT NULL,
                "assetId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_methods" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "addresses" text NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verified_at" date NOT NULL,
                "status" text NOT NULL,
                "expires_at" date,
                "auth_meta_data" text,
                "userId" integer,
                "authMethodId" integer,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_requests" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destination_address" varchar NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_packages" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "type" text NOT NULL DEFAULT ('normal'),
                "status" text NOT NULL DEFAULT ('show'),
                "open_at" date,
                "close_at" date,
                "delay" bigint NOT NULL,
                "number_each_user" integer NOT NULL,
                "assetId" integer,
                CONSTRAINT "FK_619fc00abe2214a031bbad8e3db" FOREIGN KEY ("assetId") REFERENCES "assets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_packages"(
                    "id",
                    "name",
                    "description",
                    "type",
                    "status",
                    "open_at",
                    "close_at",
                    "delay",
                    "number_each_user",
                    "assetId"
                )
            SELECT "id",
                "name",
                "description",
                "type",
                "status",
                "open_at",
                "close_at",
                "delay",
                "number_each_user",
                "assetId"
            FROM "packages"
        `);
    await queryRunner.query(`
            DROP TABLE "packages"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_packages"
                RENAME TO "packages"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_package_auth_methods" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "FK_7e03ff9d7d8db8762dd37cf45fe" FOREIGN KEY ("packageId") REFERENCES "packages" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_9c330efd4c48cf31b91bcec46d4" FOREIGN KEY ("authMethodId") REFERENCES "auth_methods" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_package_auth_methods"("id", "order", "packageId", "authMethodId")
            SELECT "id",
                "order",
                "packageId",
                "authMethodId"
            FROM "package_auth_methods"
        `);
    await queryRunner.query(`
            DROP TABLE "package_auth_methods"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_package_auth_methods"
                RENAME TO "package_auth_methods"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_user_auth_status" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verified_at" date NOT NULL,
                "status" text NOT NULL,
                "expires_at" date,
                "auth_meta_data" text,
                "userId" integer,
                "authMethodId" integer,
                "packageId" integer,
                CONSTRAINT "FK_8ea613eba2b2252ac6bf26b6ca0" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_9b2223f8874f9a0eedc50b4a2ee" FOREIGN KEY ("authMethodId") REFERENCES "auth_methods" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_8aece46daed97cf2f87809d9c0b" FOREIGN KEY ("packageId") REFERENCES "packages" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_auth_status"(
                    "id",
                    "verified_at",
                    "status",
                    "expires_at",
                    "auth_meta_data",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verified_at",
                "status",
                "expires_at",
                "auth_meta_data",
                "userId",
                "authMethodId",
                "packageId"
            FROM "user_auth_status"
        `);
    await queryRunner.query(`
            DROP TABLE "user_auth_status"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_auth_status"
                RENAME TO "user_auth_status"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_user_requests" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destination_address" varchar NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer,
                CONSTRAINT "FK_97d5891eebc1df1ce0e13de9bef" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_a44de4d171ace5d20cbbd9cb59f" FOREIGN KEY ("packageId") REFERENCES "packages" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_requests"(
                    "id",
                    "timestamp",
                    "destination_address",
                    "status",
                    "userId",
                    "packageId"
                )
            SELECT "id",
                "timestamp",
                "destination_address",
                "status",
                "userId",
                "packageId"
            FROM "user_requests"
        `);
    await queryRunner.query(`
            DROP TABLE "user_requests"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_requests"
                RENAME TO "user_requests"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_requests"
                RENAME TO "temporary_user_requests"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_requests" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destination_address" varchar NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_requests"(
                    "id",
                    "timestamp",
                    "destination_address",
                    "status",
                    "userId",
                    "packageId"
                )
            SELECT "id",
                "timestamp",
                "destination_address",
                "status",
                "userId",
                "packageId"
            FROM "temporary_user_requests"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_requests"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status"
                RENAME TO "temporary_user_auth_status"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verified_at" date NOT NULL,
                "status" text NOT NULL,
                "expires_at" date,
                "auth_meta_data" text,
                "userId" integer,
                "authMethodId" integer,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_auth_status"(
                    "id",
                    "verified_at",
                    "status",
                    "expires_at",
                    "auth_meta_data",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verified_at",
                "status",
                "expires_at",
                "auth_meta_data",
                "userId",
                "authMethodId",
                "packageId"
            FROM "temporary_user_auth_status"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_auth_status"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_methods"
                RENAME TO "temporary_package_auth_methods"
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_methods" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "package_auth_methods"("id", "order", "packageId", "authMethodId")
            SELECT "id",
                "order",
                "packageId",
                "authMethodId"
            FROM "temporary_package_auth_methods"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_package_auth_methods"
        `);
    await queryRunner.query(`
            ALTER TABLE "packages"
                RENAME TO "temporary_packages"
        `);
    await queryRunner.query(`
            CREATE TABLE "packages" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "description" text NOT NULL,
                "type" text NOT NULL DEFAULT ('normal'),
                "status" text NOT NULL DEFAULT ('show'),
                "open_at" date,
                "close_at" date,
                "delay" bigint NOT NULL,
                "number_each_user" integer NOT NULL,
                "assetId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "packages"(
                    "id",
                    "name",
                    "description",
                    "type",
                    "status",
                    "open_at",
                    "close_at",
                    "delay",
                    "number_each_user",
                    "assetId"
                )
            SELECT "id",
                "name",
                "description",
                "type",
                "status",
                "open_at",
                "close_at",
                "delay",
                "number_each_user",
                "assetId"
            FROM "temporary_packages"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_packages"
        `);
    await queryRunner.query(`
            DROP TABLE "user_requests"
        `);
    await queryRunner.query(`
            DROP TABLE "user_auth_status"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP TABLE "package_auth_methods"
        `);
    await queryRunner.query(`
            DROP TABLE "packages"
        `);
    await queryRunner.query(`
            DROP TABLE "auth_methods"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_8eb9150ab77f3c0bc042b83719"
        `);
    await queryRunner.query(`
            DROP TABLE "assets"
        `);
  }
}
