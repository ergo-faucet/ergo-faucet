import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1748729967648 implements MigrationInterface {
  name = 'Migration1748729967648';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "auth_method_entity" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "config" text NOT NULL,
                CONSTRAINT "PK_7b41d2d1aef333041229308da22" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_method_entity" (
                "id" SERIAL NOT NULL,
                "order" integer NOT NULL,
                "package_id" integer,
                "auth_method_id" integer,
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
                "open_at" date,
                "close_at" date,
                "delay" bigint NOT NULL,
                "number_each_user" integer NOT NULL,
                CONSTRAINT "PK_4a054211f29714c2bdbbccd9fea" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "asset_entity" (
                "id" SERIAL NOT NULL,
                "tokenId" character varying NOT NULL,
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL,
                "package_id" integer,
                CONSTRAINT "PK_038b7b28b83db2205747ef9912e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_941e620c721dbd2ec1a03bdef3" ON "asset_entity" ("tokenId")
        `);
    await queryRunner.query(`
            CREATE TABLE "user_address_entity" (
                "id" SERIAL NOT NULL,
                "value" character varying NOT NULL,
                "user_id" integer,
                CONSTRAINT "PK_0b981d423406bfb13aa34c7dfd8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_entity" (
                "id" SERIAL NOT NULL,
                CONSTRAINT "PK_b54f8ea623b17094db7667d8206" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status_entity" (
                "id" SERIAL NOT NULL,
                "verifiedAt" date NOT NULL,
                "status" text NOT NULL,
                "expiresAt" date,
                "authMetaData" text,
                "user_id" integer NOT NULL,
                "auth_method_id" integer NOT NULL,
                "package_id" integer,
                CONSTRAINT "PK_900a5ffdddb2f4ecb46ef347d5d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_request_entity" (
                "id" SERIAL NOT NULL,
                "timestamp" date NOT NULL,
                "destinationAddress" character varying NOT NULL,
                "status" text NOT NULL,
                "user_id" integer,
                "package_id" integer,
                CONSTRAINT "PK_1a06e346f47b05bcfc45ef748f9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "FK_9e692bd33c217783ebb6c027afb" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "FK_7fcb88864b51e24d07a912a0c68" FOREIGN KEY ("auth_method_id") REFERENCES "auth_method_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity"
            ADD CONSTRAINT "FK_38ec839e81d35bb2748d8152093" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_address_entity"
            ADD CONSTRAINT "FK_cdd51042e29bcf208b3de5e06ed" FOREIGN KEY ("user_id") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_51088000d10159035652128ed98" FOREIGN KEY ("user_id") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_12f15867751aed20acb219e50e4" FOREIGN KEY ("auth_method_id") REFERENCES "auth_method_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_f1fabd5104262e9a859e0a112c1" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD CONSTRAINT "FK_71ff7a20d477cc2d43b1195d624" FOREIGN KEY ("user_id") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD CONSTRAINT "FK_f64f8fef102a948db0bf83cd5ae" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP CONSTRAINT "FK_f64f8fef102a948db0bf83cd5ae"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP CONSTRAINT "FK_71ff7a20d477cc2d43b1195d624"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_f1fabd5104262e9a859e0a112c1"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_12f15867751aed20acb219e50e4"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_51088000d10159035652128ed98"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_address_entity" DROP CONSTRAINT "FK_cdd51042e29bcf208b3de5e06ed"
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity" DROP CONSTRAINT "FK_38ec839e81d35bb2748d8152093"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "FK_7fcb88864b51e24d07a912a0c68"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "FK_9e692bd33c217783ebb6c027afb"
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
  }
}
