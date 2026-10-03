import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateAnnouncements1791017497101 implements MigrationInterface {
  name = 'CreateAnnouncements1791017497101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'announcements',
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
            name: 'category',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'published_at',
            type: 'datetime',
          },
          {
            name: 'author_id',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'announcements',
      new TableForeignKey({
        columnNames: ['author_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('announcements');
  }
}
