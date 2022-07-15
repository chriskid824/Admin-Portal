import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class session1642039952660 implements MigrationInterface {
  name = 'session1642039952660'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn('session', 'json', 
      new TableColumn({
        name: 'json',
        type: 'longtext',
        isNullable: false
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn('session', 'json',
      new TableColumn({
        name: 'json',
        type: 'text',
        isNullable: false
      })
    );
  }

}
