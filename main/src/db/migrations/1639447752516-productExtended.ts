import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class productExtended1639447752516 implements MigrationInterface {
    name = 'productExtended1639447752516'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: 'productExtended',
            columns : [
                {
                    name: 'id',
                    type: 'integer',
                    isPrimary: true,
                    isNullable: false,
                    isGenerated: true,
                    generationStrategy: 'increment'
                },
                {
                    name: "productId",
                    type: 'integer',
                    isNullable: false,
                    unsigned: true,
                    length: "11"
                },
                {
                    name: "userId",
                    type: "integer",
                    isNullable: false,
                    length: "11"
                }
            ]
        }),true)
  
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("productExtended");
    }

}
