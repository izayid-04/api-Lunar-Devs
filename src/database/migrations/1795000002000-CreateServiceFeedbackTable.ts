import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceFeedbackTable1795000002000 implements MigrationInterface {
  name = 'CreateServiceFeedbackTable1795000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`service_feedbacks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`service_id\` int NOT NULL,
        \`citizen_id\` int NOT NULL,
        \`rating\` int NOT NULL,
        \`comment\` text NULL,
        \`reference\` varchar(100) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_service_citizen\` (\`service_id\`, \`citizen_id\`),
        UNIQUE KEY \`UQ_feedback_reference\` (\`reference\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_service_feedback_service\` FOREIGN KEY (\`service_id\`) REFERENCES \`municipal_services\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_service_feedback_citizen\` FOREIGN KEY (\`citizen_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`service_feedbacks\`;`);
  }
}
