import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMunicipalServices1791017486983
  implements MigrationInterface
{
  name = 'CreateMunicipalServices1791017486983';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'municipal_services',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '150',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'details',
            type: 'text',
          },
          {
            name: 'contact',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'horaires',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'district',
            type: 'varchar',
            length: '100',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('municipal_services');
  }
}
