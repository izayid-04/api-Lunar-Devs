import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransportLinesTable1791130000000 implements MigrationInterface {
  name = 'CreateTransportLinesTable1791130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`transport_lines\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(50) NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`type\` VARCHAR(30) NOT NULL DEFAULT 'navette',
        \`origin\` VARCHAR(100) NULL,
        \`destination\` VARCHAR(100) NULL,
        \`status\` VARCHAR(30) NOT NULL DEFAULT 'normal',
        \`statusMessage\` VARCHAR(255) NULL,
        \`frequency\` VARCHAR(50) NULL,
        \`operatingHours\` VARCHAR(100) NULL,
        \`stops\` TEXT NULL,
        \`nextDepartures\` TEXT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_transport_lines_code\` (\`code\`),
        INDEX \`IDX_transport_lines_type\` (\`type\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`transport_lines\`;`);
  }
}
