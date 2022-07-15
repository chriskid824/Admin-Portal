import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class usermigration1636275708893 implements MigrationInterface {
  name = 'usermigration1636275708893';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'user',
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
          name: 'username',
          type: 'varchar',
          isNullable: false
        },
        {
          name: 'name',
          type: 'varchar',
          isNullable: false
        },
        {
          name: 'password',
          type: 'varchar',
          isNullable: false
        }
      ]
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user');
  }
}
