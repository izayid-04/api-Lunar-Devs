import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateKnownDevicesTable1791150000000 implements MigrationInterface {
  name = 'CreateKnownDevicesTable1791150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'known_devices',
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
            name: 'device_fingerprint',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'label',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'last_ip',
            type: 'varchar',
            length: '45',
          },
          {
            name: 'first_seen_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_seen_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'known_devices',
      new TableIndex({
        name: 'IDX_known_devices_user_fingerprint',
        columnNames: ['user_id', 'device_fingerprint'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'known_devices',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Extend notifications.type enum in MySQL to include 'security'
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM('alert', 'announcement', 'appointment_reminder', 'demande_statut', 'security') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY COLUMN \`type\` ENUM('alert', 'announcement', 'appointment_reminder', 'demande_statut') NOT NULL
    `);
    await queryRunner.dropTable('known_devices');
  }
}
