import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateCitizenMessages1791016325205 implements MigrationInterface {
  name = 'CreateCitizenMessages1791016325205';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'citizen_messages',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '20',
            isUnique: true,
            isNullable: true,
          },
          {
            name: 'author_id',
            type: 'int',
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '150',
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
            name: 'status',
            type: 'enum',
            enum: ['nouveau', 'en_cours', 'traite'],
            default: "'nouveau'",
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
      'citizen_messages',
      new TableForeignKey({
        columnNames: ['author_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('citizen_messages');
  }
}
