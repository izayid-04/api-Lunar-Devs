import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1791120000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1791120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`entityType\` VARCHAR(50) NOT NULL,
        \`entityId\` VARCHAR(64) NULL,
        \`details\` TEXT NULL,
        \`ipAddress\` VARCHAR(45) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`author_id\` INT NULL,
        INDEX \`IDX_audit_logs_action\` (\`action\`),
        INDEX \`IDX_audit_logs_entityType\` (\`entityType\`),
        INDEX \`IDX_audit_logs_entityId\` (\`entityId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_audit_logs_author_id\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\`;`);
  }
}
