import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1749324756742 implements MigrationInterface {
  name = 'Migration1749324756742';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP CONSTRAINT "FK_71ff7a20d477cc2d43b1195d624"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP CONSTRAINT "FK_f64f8fef102a948db0bf83cd5ae"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_51088000d10159035652128ed98"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_12f15867751aed20acb219e50e4"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_f1fabd5104262e9a859e0a112c1"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "FK_9e692bd33c217783ebb6c027afb"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "FK_7fcb88864b51e24d07a912a0c68"
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity" DROP CONSTRAINT "FK_38ec839e81d35bb2748d8152093"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "UQ_65785e00a90676968926d56195b"
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity"
                RENAME COLUMN "package_id" TO "packageId"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP COLUMN "user_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP COLUMN "package_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP COLUMN "user_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP COLUMN "auth_method_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP COLUMN "package_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP COLUMN "package_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP COLUMN "auth_method_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD "userId" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD "packageId" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD "userId" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD "authMethodId" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD "packageId" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD "packageId" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD "authMethodId" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order")
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
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "UQ_0ae66188ac3392947bf84cae271"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP COLUMN "authMethodId"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP COLUMN "packageId"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP COLUMN "packageId"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP COLUMN "authMethodId"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP COLUMN "userId"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP COLUMN "packageId"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity" DROP COLUMN "userId"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD "auth_method_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD "package_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD "package_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD "auth_method_id" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD "user_id" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD "package_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD "user_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity"
                RENAME COLUMN "packageId" TO "package_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "UQ_65785e00a90676968926d56195b" UNIQUE ("order", "package_id", "auth_method_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "asset_entity"
            ADD CONSTRAINT "FK_38ec839e81d35bb2748d8152093" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "FK_7fcb88864b51e24d07a912a0c68" FOREIGN KEY ("auth_method_id") REFERENCES "auth_method_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "FK_9e692bd33c217783ebb6c027afb" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_f1fabd5104262e9a859e0a112c1" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_12f15867751aed20acb219e50e4" FOREIGN KEY ("auth_method_id") REFERENCES "auth_method_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_51088000d10159035652128ed98" FOREIGN KEY ("user_id") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD CONSTRAINT "FK_f64f8fef102a948db0bf83cd5ae" FOREIGN KEY ("package_id") REFERENCES "package_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_request_entity"
            ADD CONSTRAINT "FK_71ff7a20d477cc2d43b1195d624" FOREIGN KEY ("user_id") REFERENCES "user_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }
}
