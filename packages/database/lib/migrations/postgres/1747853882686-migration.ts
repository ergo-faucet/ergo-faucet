import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1747853882686 implements MigrationInterface {
  name = 'Migration1747853882686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "assets" (
                "id" SERIAL NOT NULL,
                "tokenId" character varying NOT NULL,
                "amount" bigint NOT NULL,
                "usageDescription" text NOT NULL,
                CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_8eb9150ab77f3c0bc042b83719" ON "assets" ("tokenId")
        `);
    await queryRunner.query(`
            CREATE TABLE "auth_methods" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "config" text NOT NULL,
                CONSTRAINT "PK_17bba9bb4df315ca6603adea735" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "packages" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "description" text NOT NULL,
                "type" text NOT NULL DEFAULT 'normal',
                "status" text NOT NULL DEFAULT 'show',
                "open_at" date,
                "close_at" date,
                "delay" bigint NOT NULL,
                "number_each_user" integer NOT NULL,
                "assetId" integer,
                CONSTRAINT "PK_020801f620e21f943ead9311c98" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "package_auth_methods" (
                "id" SERIAL NOT NULL,
                "order" integer NOT NULL,
                "packageId" integer,
                "authMethodId" integer,
                CONSTRAINT "PK_03010cf64dee8e87c6a1b329c3e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "addresses" text NOT NULL,
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_auth_status" (
                "id" SERIAL NOT NULL,
                "verified_at" date NOT NULL,
                "status" text NOT NULL,
                "expires_at" date,
                "auth_meta_data" text,
                "userId" integer,
                "authMethodId" integer,
                "packageId" integer,
                CONSTRAINT "PK_0c0e890dfd18c7e2cd76c11b221" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_requests" (
                "id" SERIAL NOT NULL,
                "timestamp" date NOT NULL,
                "destination_address" character varying NOT NULL,
                "status" text NOT NULL,
                "userId" integer,
                "packageId" integer,
                CONSTRAINT "PK_b144147b72ee6fb3d4a9147073e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "packages"
            ADD CONSTRAINT "FK_619fc00abe2214a031bbad8e3db" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_methods"
            ADD CONSTRAINT "FK_7e03ff9d7d8db8762dd37cf45fe" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_methods"
            ADD CONSTRAINT "FK_9c330efd4c48cf31b91bcec46d4" FOREIGN KEY ("authMethodId") REFERENCES "auth_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status"
            ADD CONSTRAINT "FK_8ea613eba2b2252ac6bf26b6ca0" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status"
            ADD CONSTRAINT "FK_9b2223f8874f9a0eedc50b4a2ee" FOREIGN KEY ("authMethodId") REFERENCES "auth_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status"
            ADD CONSTRAINT "FK_8aece46daed97cf2f87809d9c0b" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_requests"
            ADD CONSTRAINT "FK_97d5891eebc1df1ce0e13de9bef" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_requests"
            ADD CONSTRAINT "FK_a44de4d171ace5d20cbbd9cb59f" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_requests" DROP CONSTRAINT "FK_a44de4d171ace5d20cbbd9cb59f"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_requests" DROP CONSTRAINT "FK_97d5891eebc1df1ce0e13de9bef"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status" DROP CONSTRAINT "FK_8aece46daed97cf2f87809d9c0b"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status" DROP CONSTRAINT "FK_9b2223f8874f9a0eedc50b4a2ee"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status" DROP CONSTRAINT "FK_8ea613eba2b2252ac6bf26b6ca0"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_methods" DROP CONSTRAINT "FK_9c330efd4c48cf31b91bcec46d4"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_methods" DROP CONSTRAINT "FK_7e03ff9d7d8db8762dd37cf45fe"
        `);
    await queryRunner.query(`
            ALTER TABLE "packages" DROP CONSTRAINT "FK_619fc00abe2214a031bbad8e3db"
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
            DROP INDEX "public"."IDX_8eb9150ab77f3c0bc042b83719"
        `);
    await queryRunner.query(`
            DROP TABLE "assets"
        `);
  }
}
