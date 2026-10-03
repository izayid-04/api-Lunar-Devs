import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddMunicipalServiceAvailability1791060000000
  implements MigrationInterface
{
  name = 'AddMunicipalServiceAvailability1791060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('municipal_services', [
      new TableColumn({
        name: 'availability',
        type: 'enum',
        enum: ['disponible', 'maintenance', 'incident'],
        default: "'disponible'",
      }),
      new TableColumn({
        name: 'availability_message',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'available_again_at',
        type: 'datetime',
        isNullable: true,
      }),
      new TableColumn({
        name: 'alternative',
        type: 'text',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('municipal_services', [
      'availability',
      'availability_message',
      'available_again_at',
      'alternative',
    ]);
  }
}
