import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1762941020149 implements MigrationInterface {
  name = 'Migration1762941020149';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_user_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "discord_id" varchar,
                "x_id" varchar,
                "google_id" varchar,
                "name" varchar,
                "metadata" text,
                "lastLogin" bigint,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
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
                    "lastLogin",
                    "createdAt",
                    "modifiedAt",
                    "isAdmin"
                )
            SELECT "id",
                "discord_id",
                "x_id",
                "google_id",
                "name",
                "metadata",
                "lastLogin",
                "createdAt",
                "modifiedAt",
                "isAdmin"
            FROM "user_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "user_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_user_entity"
                RENAME TO "user_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_user_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "discord_id" varchar,
                "x_id" varchar,
                "google_id" varchar,
                "name" varchar,
                "metadata" text,
                "lastLogin" integer,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
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
                    "lastLogin",
                    "createdAt",
                    "modifiedAt",
                    "isAdmin"
                )
            SELECT "id",
                "discord_id",
                "x_id",
                "google_id",
                "name",
                "metadata",
                "lastLogin",
                "createdAt",
                "modifiedAt",
                "isAdmin"
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
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "isAdmin" boolean NOT NULL DEFAULT (0),
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
                    "lastLogin",
                    "createdAt",
                    "modifiedAt",
                    "isAdmin"
                )
            SELECT "id",
                "discord_id",
                "x_id",
                "google_id",
                "name",
                "metadata",
                "lastLogin",
                "createdAt",
                "modifiedAt",
                "isAdmin"
            FROM "temporary_user_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_entity"
        `);
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
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "isAdmin" boolean NOT NULL DEFAULT (0),
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
                    "lastLogin",
                    "createdAt",
                    "modifiedAt",
                    "isAdmin"
                )
            SELECT "id",
                "discord_id",
                "x_id",
                "google_id",
                "name",
                "metadata",
                "lastLogin",
                "createdAt",
                "modifiedAt",
                "isAdmin"
            FROM "temporary_user_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_entity"
        `);
  }
}
