import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddLoginSecurityAndAttempts1791050000000
  implements MigrationInterface
{
  name = 'AddLoginSecurityAndAttempts1791050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add failed_login_attempts and locked_until to users
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'failed_login_attempts',
        type: 'int',
        default: 0,
      }),
      new TableColumn({
        name: 'locked_until',
        type: 'datetime',
        isNullable: true,
      }),
    ]);

    // 2. Create login_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'login_attempts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'success',
            type: 'boolean',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'login_attempts',
      new TableIndex({
        name: 'IDX_login_attempts_email',
        columnNames: ['email'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('login_attempts');
    await queryRunner.dropColumns('users', [
      'failed_login_attempts',
      'locked_until',
    ]);
  }
}
