import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class user1636277458202 implements MigrationInterface {
  name = 'user1636277458202';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'temporary_user',
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
          name: 'isActive',
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
    await queryRunner.manager.createQueryBuilder()
      .insert().into('temporary_user', ['id', 'username', 'isActive', 'password'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'name', 'password']).from('user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('user');
    await queryRunner.renameTable('temporary_user', 'user');
    await queryRunner.createTable(new Table({
      name: 'temporary_user',
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
          name: 'isActive',
          type: 'boolean',
          isNullable: false,
          default: 1
        },
        {
          name: 'password',
          type: 'varchar',
          isNullable: false
        }
      ]
    }), true);
    await queryRunner.manager.createQueryBuilder()
      .insert().into('temporary_user', ['id', 'username', 'isActive', 'password'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'isActive', 'password']).from('user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('user');
    await queryRunner.renameTable('temporary_user', 'user');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameTable('user', 'temporary_user');
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
          name: 'isActive',
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
    await queryRunner.manager.createQueryBuilder()
      .insert().into('user', ['id', 'username', 'isActive', 'password'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'isActive', 'password']).from('temporary_user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('temporary_user');
    await queryRunner.renameTable('user', 'temporary_user');
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
    await queryRunner.manager.createQueryBuilder()
      .insert().into('user', ['id', 'username', 'name', 'password'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'isActive', 'password']).from('temporary_user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('temporary_user');
  }
}
