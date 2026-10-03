import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddUserIsActive1791100000000 implements MigrationInterface {
  name = 'AddUserIsActive1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'is_active');
  }
}
