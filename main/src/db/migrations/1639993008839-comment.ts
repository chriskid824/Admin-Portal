import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class comment1639993008839 implements MigrationInterface {
  name = 'comment1639993008839'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn('comment', 'targetId', 
      new TableColumn({
        name: 'targetId',
        type: 'bigint',
        isNullable: false
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn('comment', 'targetId',
      new TableColumn({
        name: 'targetId',
        type: 'integer',
        isNullable: false
      })
    );
  }

}
