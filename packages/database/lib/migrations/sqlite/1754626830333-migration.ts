import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1754626830333 implements MigrationInterface {
  name = 'Migration1754626830333';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "temporary_user_request_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "timestamp" date NOT NULL,
                "destinationAddress" varchar NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer,
                "signed_tx" text,
                "creationHeight" integer,
                "numberOfTries" integer NOT NULL DEFAULT (0),
                "txId" text,
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
                    "packageId",
                    "signed_tx",
                    "creationHeight",
                    "numberOfTries"
                )
            SELECT "id",
                "timestamp",
                "destinationAddress",
                "status",
                "userId",
                "packageId",
                "signed_tx",
                "creationHeight",
                "numberOfTries"
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
                "userId" integer,
                "packageId" integer,
                "signed_tx" text,
                "creationHeight" integer,
                "numberOfTries" integer NOT NULL DEFAULT (0),
                CONSTRAINT "FK_81e7a8f90b7f4b7e6d36c86aeea" FOREIGN KEY ("userId") REFERENCES "user_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_d1a8058eb7a3869b932f1905afd" FOREIGN KEY ("packageId") REFERENCES "package_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_request_entity"(
                    "id",
                    "timestamp",
                    "destinationAddress",
                    "status",
                    "userId",
                    "packageId",
                    "signed_tx",
                    "creationHeight",
                    "numberOfTries"
                )
            SELECT "id",
                "timestamp",
                "destinationAddress",
                "status",
                "userId",
                "packageId",
                "signed_tx",
                "creationHeight",
                "numberOfTries"
            FROM "temporary_user_request_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_user_request_entity"
        `);
  }
}
