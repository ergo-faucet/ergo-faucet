import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1757219948595 implements MigrationInterface {
  name = 'Migration1757219948595';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "UQ_0ae66188ac3392947bf84cae271"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ALTER COLUMN "order" DROP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("packageId", "authMethodId", "order")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity" DROP CONSTRAINT "UQ_0ae66188ac3392947bf84cae271"
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ALTER COLUMN "order"
            SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "package_auth_method_entity"
            ADD CONSTRAINT "UQ_0ae66188ac3392947bf84cae271" UNIQUE ("order", "packageId", "authMethodId")
        `);
  }
}
