import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1760624455287 implements MigrationInterface {
  name = 'Migration1760624455287';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order"),
                CONSTRAINT "FK_c850da4a6db32f58d834e68ac57" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2626bb61c0eb6af245c70a6fb5b" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            CREATE TABLE "temporary_package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer,
                "packageId" integer,
                "authMethodId" integer,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order"),
                CONSTRAINT "FK_c850da4a6db32f58d834e68ac57" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2626bb61c0eb6af245c70a6fb5b" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
                RENAME TO "temporary_package_auth_method_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order"),
                CONSTRAINT "FK_c850da4a6db32f58d834e68ac57" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2626bb61c0eb6af245c70a6fb5b" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
            ALTER TABLE "package_auth_method_entity"
                RENAME TO "temporary_package_auth_method_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_method_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "order" integer,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "modified_at" datetime NOT NULL DEFAULT (datetime('now')),
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order"),
                CONSTRAINT "FK_c850da4a6db32f58d834e68ac57" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_2626bb61c0eb6af245c70a6fb5b" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
  }
}
