import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParticipationTables1795000001000 implements MigrationInterface {
  name = 'CreateParticipationTables1795000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`projects\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) NOT NULL,
        \`description\` text NOT NULL,
        \`district\` varchar(100) NOT NULL,
        \`status\` enum('propose', 'en_cours', 'termine', 'suspendu') NOT NULL DEFAULT 'en_cours',
        \`start_date\` date NULL,
        \`end_date\` date NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`consultations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`project_id\` int NOT NULL,
        \`question\` varchar(255) NOT NULL,
        \`options\` text NOT NULL,
        \`end_date\` datetime NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_consultations_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`consultation_responses\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`consultation_id\` int NOT NULL,
        \`citizen_id\` int NOT NULL,
        \`reference\` varchar(100) NOT NULL,
        \`option\` varchar(255) NOT NULL,
        \`comment\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_consultation_citizen\` (\`consultation_id\`, \`citizen_id\`),
        UNIQUE KEY \`UQ_consultation_reference\` (\`reference\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_consultation_responses_consultation\` FOREIGN KEY (\`consultation_id\`) REFERENCES \`consultations\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_consultation_responses_citizen\` FOREIGN KEY (\`citizen_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`ideas\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`reference\` varchar(100) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text NOT NULL,
        \`district\` varchar(100) NULL,
        \`status\` enum('soumise', 'en_etude', 'retenue', 'rejetee') NOT NULL DEFAULT 'soumise',
        \`admin_note\` text NULL,
        \`citizen_id\` int NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_idea_reference\` (\`reference\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_ideas_citizen\` FOREIGN KEY (\`citizen_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`ideas\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`consultation_responses\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`consultations\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`projects\`;`);
  }
}
