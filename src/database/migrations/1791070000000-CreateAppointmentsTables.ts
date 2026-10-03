import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateAppointmentsTables1791070000000
  implements MigrationInterface
{
  name = 'CreateAppointmentsTables1791070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create appointment_slots table
    await queryRunner.createTable(
      new Table({
        name: 'appointment_slots',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'agent_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'service_id',
            type: 'int',
          },
          {
            name: 'starts_at',
            type: 'datetime',
          },
          {
            name: 'ends_at',
            type: 'datetime',
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'is_available',
            type: 'boolean',
            default: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
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
      'appointment_slots',
      new TableForeignKey({
        columnNames: ['agent_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'appointment_slots',
      new TableForeignKey({
        columnNames: ['service_id'],
        referencedTableName: 'municipal_services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 2. Create appointments table
    await queryRunner.createTable(
      new Table({
        name: 'appointments',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'citizen_id',
            type: 'int',
          },
          {
            name: 'slot_id',
            type: 'int',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'required_documents',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['confirme', 'annule'],
            default: "'confirme'",
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
      'appointments',
      new TableForeignKey({
        columnNames: ['citizen_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        columnNames: ['slot_id'],
        referencedTableName: 'appointment_slots',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('appointments');
    await queryRunner.dropTable('appointment_slots');
  }
}
