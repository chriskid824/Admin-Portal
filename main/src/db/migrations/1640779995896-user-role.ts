import {MigrationInterface, QueryRunner, Table, TableForeignKey} from "typeorm";

export class userRole1640779995895 implements MigrationInterface {
  name = 'userRole1640779995896'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'user_role',
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
          name: 'userId',
          type: 'integer',
          isNullable: false
        },
        {
          name: 'roleId',
          type: 'integer',
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
          isNullable: true,
        },
      ]
    }), true);

    const foreignKey = new TableForeignKey({
      columnNames: ["userId"],
      referencedColumnNames: ["id"],
      referencedTableName: "user",
      onDelete: "CASCADE"
    });
    await queryRunner.createForeignKey("user_role", foreignKey);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const foreignKey = new TableForeignKey({
      columnNames: ["userId"],
      referencedColumnNames: ["id"],
      referencedTableName: "user",
      onDelete: "CASCADE"
    });
    await queryRunner.dropForeignKey("user_role", foreignKey);
    await queryRunner.dropTable('user_role');
  }

}
