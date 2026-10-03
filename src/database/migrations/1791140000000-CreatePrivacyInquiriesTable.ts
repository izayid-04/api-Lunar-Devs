import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePrivacyInquiriesTable1791140000000 implements MigrationInterface {
  name = 'CreatePrivacyInquiriesTable1791140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`privacy_inquiries\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`reference\` VARCHAR(50) NOT NULL,
        \`type\` VARCHAR(40) NOT NULL DEFAULT 'explication',
        \`subject\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`status\` VARCHAR(30) NOT NULL DEFAULT 'en_attente',
        \`responseNote\` TEXT NULL,
        \`respondedAt\` DATETIME NULL,
        \`citizen_id\` INT NOT NULL,
        \`responded_by_id\` INT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_privacy_inquiries_ref\` (\`reference\`),
        INDEX \`IDX_privacy_inquiries_type\` (\`type\`),
        INDEX \`IDX_privacy_inquiries_status\` (\`status\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_privacy_inquiries_citizen\` FOREIGN KEY (\`citizen_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_privacy_inquiries_responded_by\` FOREIGN KEY (\`responded_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`privacy_inquiries\`;`);
  }
}
