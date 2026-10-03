import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddMunicipalServiceFeaturedCategoryAndGeo1791090000000
  implements MigrationInterface
{
  name = 'AddMunicipalServiceFeaturedCategoryAndGeo1791090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('municipal_services', [
      new TableColumn({
        name: 'category',
        type: 'varchar',
        length: '100',
        default: "'administratif'",
      }),
      new TableColumn({
        name: 'address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'latitude',
        type: 'decimal',
        precision: 10,
        scale: 7,
        isNullable: true,
      }),
      new TableColumn({
        name: 'longitude',
        type: 'decimal',
        precision: 10,
        scale: 7,
        isNullable: true,
      }),
      new TableColumn({
        name: 'is_featured',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'is_emergency',
        type: 'boolean',
        default: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('municipal_services', 'is_emergency');
    await queryRunner.dropColumn('municipal_services', 'is_featured');
    await queryRunner.dropColumn('municipal_services', 'longitude');
    await queryRunner.dropColumn('municipal_services', 'latitude');
    await queryRunner.dropColumn('municipal_services', 'address');
    await queryRunner.dropColumn('municipal_services', 'category');
  }
}
