import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddMessageSupportsAndNotificationType1791110000000
  implements MigrationInterface
{
  name = 'AddMessageSupportsAndNotificationType1791110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add support_count to citizen_messages
    await queryRunner.addColumn(
      'citizen_messages',
      new TableColumn({
        name: 'support_count',
        type: 'int',
        default: 0,
      }),
    );

    // 2. Create message_supports table
    await queryRunner.createTable(
      new Table({
        name: 'message_supports',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'message_id',
            type: 'int',
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            columnNames: ['message_id', 'user_id'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'message_supports',
      new TableForeignKey({
        columnNames: ['message_id'],
        referencedTableName: 'citizen_messages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'message_supports',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 3. Extend notifications.type enum in MySQL to include 'demande_statut'
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM('alert', 'announcement', 'appointment_reminder', 'demande_statut') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM('alert', 'announcement', 'appointment_reminder') NOT NULL
    `);
    await queryRunner.dropTable('message_supports');
    await queryRunner.dropColumn('citizen_messages', 'support_count');
  }
}
