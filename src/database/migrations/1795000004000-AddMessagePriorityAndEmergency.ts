import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessagePriorityAndEmergency1795000004000 implements MigrationInterface {
  name = 'AddMessagePriorityAndEmergency1795000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('citizen_messages');
    if (table && !table.findColumnByName('priority')) {
      await queryRunner.query(`
        ALTER TABLE \`citizen_messages\`
        ADD COLUMN \`priority\` enum('normale','haute','urgente') NOT NULL DEFAULT 'normale' AFTER \`status\`,
        ADD COLUMN \`is_medical_emergency\` tinyint(1) NOT NULL DEFAULT 0 AFTER \`priority\`;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('citizen_messages');
    if (table && table.findColumnByName('priority')) {
      await queryRunner.query(`
        ALTER TABLE \`citizen_messages\`
        DROP COLUMN \`is_medical_emergency\`,
        DROP COLUMN \`priority\`;
      `);
    }
  }
}
