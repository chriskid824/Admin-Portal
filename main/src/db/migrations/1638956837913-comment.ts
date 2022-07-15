import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class comment1638956837913 implements MigrationInterface {
  name = 'comment1638956837913'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'comment',
      columns: [
        {
          name: 'id',
          type: 'integer',
          isPrimary: true,
          isNullable: false,
          isGenerated: true,
          generationStrategy: 'increment'
        },
        {
          name: 'targetType',
          type: 'varchar',
          isNullable: false
        },
        {
          name: 'targetId',
          type: 'integer',
          isNullable: false
        },
        {
          name: 'authorId',
          type: 'integer',
          isNullable: false
        },
        {
          name: 'body',
          type: 'text',
          isNullable: false
        },
        {
          name: 'createdAt',
          type: 'datetime',
          isNullable: false,
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'updatedAt',
          type: 'datetime',
          isNullable: false,
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'deletedAt',
          type: 'datetime',
          isNullable: true
        }
      ]
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('comment');
  }

}
