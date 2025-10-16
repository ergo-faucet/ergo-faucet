import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1760621144720 implements MigrationInterface {
  name = 'Migration1760621144720';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "txId" text,
                "signed_tx" text,
                "creationHeight" integer,
                "numberOfTries" integer NOT NULL DEFAULT (0),
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "userId" integer,
                "packageId" integer,
                CONSTRAINT "FK_d1a8058eb7a3869b932f1905afd" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_81e7a8f90b7f4b7e6d36c86aeea" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_user_request_entity"(
                    "id",
                    "destinationAddress",
                    "status",
                    "txId",
                    "signed_tx",
                    "creationHeight",
                    "numberOfTries",
                    "createdAt",
                    "modifiedAt",
                    "userId",
                    "packageId"
                )
            SELECT "id",
                "destinationAddress",
                "status",
                "txId",
                "signed_tx",
                "creationHeight",
                "numberOfTries",
                "createdAt",
                "modifiedAt",
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
                RENAME TO "temporary_user_request_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" integer NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "txId" text,
                "signed_tx" text,
                "creationHeight" integer,
                "numberOfTries" integer NOT NULL DEFAULT (0),
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "userId" integer,
                "packageId" integer,
                CONSTRAINT "FK_d1a8058eb7a3869b932f1905afd" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_81e7a8f90b7f4b7e6d36c86aeea" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_request_entity"(
                    "id",
                    "destinationAddress",
                    "status",
                    "txId",
                    "signed_tx",
                    "creationHeight",
                    "numberOfTries",
                    "createdAt",
                    "modifiedAt",
                    "userId",
                    "packageId"
                )
            SELECT "id",
                "destinationAddress",
                "status",
                "txId",
                "signed_tx",
                "creationHeight",
                "numberOfTries",
                "createdAt",
                "modifiedAt",
                "userId",
                "packageId"
            FROM "temporary_user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_request_entity"
        `);
  }
}
