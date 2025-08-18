import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1755508470649 implements MigrationInterface {
  name = 'Migration1755508470649';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_entity"
            ADD "isAdmin" boolean NOT NULL DEFAULT false
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ALTER COLUMN "packageId" DROP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109" FOREIGN KEY ("packageId") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity" DROP CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ALTER COLUMN "packageId"
            SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "user_auth_status_entity"
            ADD CONSTRAINT "FK_66bd1b1ac02bcbbf13ca3964109" FOREIGN KEY ("packageId") REFERENCES "package_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_entity" DROP COLUMN "isAdmin"
        `);
  }
}
