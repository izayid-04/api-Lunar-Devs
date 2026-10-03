import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class CreateAlertsAndNotifications1791040000000
  implements MigrationInterface
{
  name = 'CreateAlertsAndNotifications1791040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add is_important column to announcements
    await queryRunner.addColumn(
      'announcements',
      new TableColumn({
        name: 'is_important',
        type: 'boolean',
        default: false,
      }),
    );

    // 2. Create alerts table
    await queryRunner.createTable(
      new Table({
        name: 'alerts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'body',
            type: 'text',
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['info', 'important', 'urgent'],
            default: "'info'",
          },
          {
            name: 'target',
            type: 'enum',
            enum: ['all', 'district', 'vulnerable'],
            default: "'all'",
          },
          {
            name: 'target_district',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'starts_at',
            type: 'datetime',
          },
          {
            name: 'expires_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'author_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'alerts',
      new TableForeignKey({
        columnNames: ['author_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 3. Create notifications table
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['alert', 'announcement', 'appointment_reminder'],
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'link',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'read_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
    await queryRunner.dropTable('alerts');
    await queryRunner.dropColumn('announcements', 'is_important');
  }
}
