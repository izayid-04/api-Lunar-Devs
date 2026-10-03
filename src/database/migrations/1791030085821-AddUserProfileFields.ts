import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserProfileFields1791030085821 implements MigrationInterface {
  name = 'AddUserProfileFields1791030085821';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'district',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'preferred_language',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'is_vulnerable',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'profile_completed',
        type: 'boolean',
        default: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('users', [
      'district',
      'preferred_language',
      'is_vulnerable',
      'profile_completed',
    ]);
  }
}
