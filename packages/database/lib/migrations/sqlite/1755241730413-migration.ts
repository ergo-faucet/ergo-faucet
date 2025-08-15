import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755241730413 implements MigrationInterface {
  name = 'Migration1755241730413';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "metadata" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer NOT NULL,
                CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_1706f917d940b8559937eb33f8e" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_359a7061b1cce4191f212893715" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
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
            CREATE TABLE "temporary_user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "metadata" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
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
            CREATE TABLE "temporary_user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "metadata" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
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
            CREATE TABLE "temporary_user_auth_status_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "metadata" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer,
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
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
                "metadata" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
                "userId",
                "authMethodId",
                "packageId"
            FROM "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_auth_status_entity"
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
                "metadata" text,
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
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
                "userId",
                "authMethodId",
                "packageId"
            FROM "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_auth_status_entity"
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
                "metadata" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer NOT NULL,
                CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
                "userId",
                "authMethodId",
                "packageId"
            FROM "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_auth_status_entity"
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
                "metadata" text,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer NOT NULL,
                CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_1706f917d940b8559937eb33f8e" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_359a7061b1cce4191f212893715" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_auth_status_entity"(
                    "id",
                    "verifiedAt",
                    "status",
                    "expiresAt",
                    "metadata",
                    "userId",
                    "authMethodId",
                    "packageId"
                )
            SELECT "id",
                "verifiedAt",
                "status",
                "expiresAt",
                "metadata",
                "userId",
                "authMethodId",
                "packageId"
            FROM "temporary_user_auth_status_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_auth_status_entity"
        `);
  }
}
