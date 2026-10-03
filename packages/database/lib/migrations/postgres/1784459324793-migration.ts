import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1784459324793 implements MigrationInterface {
  name = 'Migration1784459324793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user_address_entity" (
                "id" SERIAL NOT NULL,
                "value" character varying NOT NULL,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "userId" integer,
                CONSTRAINT "UQ_bbfe7dadd3cd07bbcc25b559ad1" UNIQUE ("value"),
                CONSTRAINT "PK_0b981d423406bfb13aa34c7dfd8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_request_entity" (
                "id" SERIAL NOT NULL,
                "destinationAddress" character varying NOT NULL,
                "status" text NOT NULL,
                "txId" text,
                "signed_tx" text,
                "creationHeight" integer,
                "numberOfTries" integer NOT NULL DEFAULT '0',
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "userId" integer,
                "packageId" integer,
                CONSTRAINT "PK_1a06e346f47b05bcfc45ef748f9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_entity" (
                "id" SERIAL NOT NULL,
                "discord_id" character varying,
                "x_id" character varying,
                "google_id" character varying,
                "name" character varying,
                "metadata" text,
                "lastLogin" integer,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "isAdmin" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_d21d8b1697402c5288441fe9322" UNIQUE ("discord_id"),
                CONSTRAINT "UQ_c90663850593629f210649c7891" UNIQUE ("x_id"),
                CONSTRAINT "UQ_85e382b226c35988718a4b5899d" UNIQUE ("google_id"),
                CONSTRAINT "PK_b54f8ea623b17094db7667d8206" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status_entity" (
                "id" SERIAL NOT NULL,
                "verifiedAt" integer NOT NULL,
                "status" text NOT NULL,
                "expiresAt" integer,
                "metadata" text,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "userId" integer NOT NULL,
                "authMethodId" integer NOT NULL,
                "packageId" integer,
                CONSTRAINT "PK_900a5ffdddb2f4ecb46ef347d5d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "auth_method_entity" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "config" text NOT NULL,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                CONSTRAINT "PK_7b41d2d1aef333041229308da22" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_method_entity" (
                "id" SERIAL NOT NULL,
                "order" integer,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order"),
                CONSTRAINT "PK_4b378e0b1bc00bada7a8f5183ea" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "package_entity" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" text NOT NULL,
                "type" text NOT NULL DEFAULT 'normal',
                "status" text NOT NULL DEFAULT 'show',
                "open_at" integer,
                "close_at" integer,
                "delay" character varying NOT NULL DEFAULT '0',
                "number_each_user" integer NOT NULL,
                "max_payout" integer,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                CONSTRAINT "PK_4a054211f29714c2bdbbccd9fea" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "asset_entity" (
                "id" SERIAL NOT NULL,
                "tokenId" character varying NOT NULL,
                "asset_name" character varying NOT NULL,
                "amount" character varying NOT NULL,
                "decimals" integer NOT NULL,
                "usageDescription" text NOT NULL,
                "createdAt" integer NOT NULL,
                "modifiedAt" integer NOT NULL,
                "weight" integer DEFAULT '10',
                "packageId" integer,
                CONSTRAINT "PK_038b7b28b83db2205747ef9912e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_941e620c721dbd2ec1a03bdef3" ON "asset_entity" ("tokenId")
        `);
    await queryRunner.query(`
            ALTER TABLE "user_address_entity"
            ADD CONSTRAINT "FK_8015306c9dd58bdfaf36a74d3f1" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD CONSTRAINT "FK_81e7a8f90b7f4b7e6d36c86aeea" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD CONSTRAINT "FK_d1a8058eb7a3869b932f1905afd" FOREIGN KEY ("packageId") REFERENCES "package_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_359a7061b1cce4191f212893715" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_1706f917d940b8559937eb33f8e" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109" FOREIGN KEY ("packageId") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "FK_2626bb61c0eb6af245c70a6fb5b" FOREIGN KEY ("packageId") REFERENCES "package_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "FK_c850da4a6db32f58d834e68ac57" FOREIGN KEY ("authMethodId") REFERENCES "auth_method_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity"
            ADD CONSTRAINT "FK_dc2ee4d919892ecaad131a176e5" FOREIGN KEY ("packageId") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "asset_entity" DROP CONSTRAINT "FK_dc2ee4d919892ecaad131a176e5"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "FK_c850da4a6db32f58d834e68ac57"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "FK_2626bb61c0eb6af245c70a6fb5b"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_1706f917d940b8559937eb33f8e"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_359a7061b1cce4191f212893715"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP CONSTRAINT "FK_d1a8058eb7a3869b932f1905afd"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP CONSTRAINT "FK_81e7a8f90b7f4b7e6d36c86aeea"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_address_entity" DROP CONSTRAINT "FK_8015306c9dd58bdfaf36a74d3f1"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_941e620c721dbd2ec1a03bdef3"
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
