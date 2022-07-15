import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from "typeorm";

export class session1636898177566 implements MigrationInterface {
  name = 'session1636898177566'

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
          type: 'boolean',
          isNullable: false,
          default: 1
        },
        {
          name: 'password',
          type: 'varchar',
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
        }
      ]
    }), true);
    await queryRunner.manager.createQueryBuilder()
      .insert().into('temporary_user', ['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt']).from('user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('user');
    await queryRunner.renameTable('temporary_user', 'user');
    await queryRunner.createTable(new Table({
      name: 'session',
      columns: [
        {
          name: 'expiredAt',
          type: 'bigint',
          isNullable: false
        },
        {
          name: 'id',
          type: 'varchar(255)',
          isPrimary: true,
          isNullable: false
        },
        {
          name: 'json',
          type: 'text',
          isNullable: false
        }
      ]
    }), true);
    await queryRunner.createIndex('session', new TableIndex({
      name: 'IDX_28c5d1d16da7908c97c9bc2f74',
      columnNames: ['expiredAt']
    }));
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
          isNullable: false,
          isUnique: true
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
        }
      ]
    }), true);
    await queryRunner.manager.createQueryBuilder()
      .insert().into('temporary_user', ['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt']).from('user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('user');
    await queryRunner.renameTable('temporary_user', 'user');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameTable('user', 'temporary_user');
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
        }
      ]
    }), true);
    await queryRunner.manager.createQueryBuilder()
      .insert().into('user', ['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt']).from('temporary_user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('temporary_user');
    await queryRunner.dropIndex('session', 'IDX_28c5d1d16da7908c97c9bc2f74');
    await queryRunner.dropTable('session');
    await queryRunner.renameTable('user', 'temporary_user');
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
        }
      ]
    }), true);
    await queryRunner.manager.createQueryBuilder()
      .insert().into('user', ['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt'])
      .values(await queryRunner.manager.createQueryBuilder()
        .select(['id', 'username', 'isActive', 'password', 'createdAt', 'updatedAt']).from('temporary_user', 'u').getRawMany()
      )
      .execute();
    await queryRunner.dropTable('temporary_user');
  }

}
