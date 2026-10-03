import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddMessageStatusHistoryAndSignalementFields1791080000000
  implements MigrationInterface
{
  name = 'AddMessageStatusHistoryAndSignalementFields1791080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add type, district, precise_location to citizen_messages
    await queryRunner.addColumns('citizen_messages', [
      new TableColumn({
        name: 'type',
        type: 'enum',
        enum: ['question', 'signalement'],
        default: "'question'",
      }),
      new TableColumn({
        name: 'district',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'precise_location',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    ]);

    // 2. Create message_status_history table
    await queryRunner.createTable(
      new Table({
        name: 'message_status_history',
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
            name: 'status',
            type: 'enum',
            enum: ['nouveau', 'en_cours', 'traite'],
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'changed_by_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'changed_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // 3. Add foreign keys
    await queryRunner.createForeignKey(
      'message_status_history',
      new TableForeignKey({
        columnNames: ['message_id'],
        referencedTableName: 'citizen_messages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'message_status_history',
      new TableForeignKey({
        columnNames: ['changed_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 4. Backfill existing citizen_messages with an initial history entry
    await queryRunner.query(`
      INSERT INTO message_status_history (message_id, status, note, changed_by_id, changed_at)
      SELECT id, status, 'Message créé', author_id, created_at
      FROM citizen_messages
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('message_status_history');
    await queryRunner.dropColumn('citizen_messages', 'precise_location');
    await queryRunner.dropColumn('citizen_messages', 'district');
    await queryRunner.dropColumn('citizen_messages', 'type');
  }
}
