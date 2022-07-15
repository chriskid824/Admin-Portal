import { InjectConnection } from "@nestjs/typeorm";
import { Connection, DeleteQueryBuilder, InsertQueryBuilder, QueryBuilder, SelectQueryBuilder, UpdateQueryBuilder } from "typeorm";
import { RawData } from "./BaseModel";

export abstract class BaseService {
  protected abstract readonly tableName: string;
  protected abstract readonly tableAlias: string;
  protected columns: string[] = [];
  protected columnsWithAlias: string[];

  constructor(
    @InjectConnection('backend')
    protected connection: Connection,
  ) { }

  private mapColumns() {
    this.columnsWithAlias = this.columns.map((c) => `${this.tableAlias}.${c} ${c}`);
  }

  protected getQueryBuilder(): QueryBuilder<any> {
    return this.connection.manager.createQueryBuilder();
  }

  protected select(columns?: string[]): SelectQueryBuilder<any> {
    if (this.columns && !this.columnsWithAlias) this.mapColumns();
    columns = columns ?? this.columnsWithAlias;
    return (columns && columns.length
      ? this.getQueryBuilder().select(columns)
      : this.getQueryBuilder().select()
    )
      .from(this.tableName, this.tableAlias);
  }

  protected insert(columns?: string[]): InsertQueryBuilder<any> {
    return this.getQueryBuilder().insert().into(this.tableName, columns);
  }

  protected update(): UpdateQueryBuilder<any> {
    return this.getQueryBuilder().update(this.tableName);
  }

  protected delete(): DeleteQueryBuilder<any> {
    return this.getQueryBuilder().delete().from(this.tableName);
  }

  protected fetchRawUnion(
    queries: SelectQueryBuilder<any>[],
    page?: number, numPerPage?: number,
    orderBy?: string, orderDir: 'ASC' | 'DESC' = 'ASC'
  ): Promise<RawData[]> {
    let last = queries[queries.length - 1];
    if (orderBy) {
      last.orderBy(orderBy, orderDir);
    }
    if (page && numPerPage) {
      last.offset((page - 1) * numPerPage).limit(numPerPage);
    }
    const stringfyQuery = (query: UnionParameters, queryBuilder: SelectQueryBuilder<any>, index: number): UnionParameters => {
      const [sql, parameters] = queryBuilder.connection.driver.escapeQueryWithParameters(queryBuilder.getQuery(), queryBuilder.getParameters(), {});
      if (!index) {
        return { sql, parameters };
      }
      return {
        sql: `${query.sql} UNION ${sql}`,
        parameters: query.parameters.concat(...parameters)
      };
    };

    const { sql, parameters } = queries.reduce(stringfyQuery, { sql: "", parameters: [] });
    return this.connection.manager.query(sql, parameters);
  }

  protected async fetchRawPaginated(
    select: SelectQueryBuilder<any>,
    page: number = 1, numPerPage: number = 50,
    orderBy?: string, orderDir: 'ASC' | 'DESC' = 'ASC'
  ): Promise<RawData[]> {
    if (orderBy) {
      select.orderBy(orderBy, orderDir);
    }
    const offset = (page - 1) * numPerPage;
    const rows = await select
      .offset(offset)
      .limit(numPerPage)
      .getRawMany();
    return rows.map((r, idx) => Object.assign({}, r, {
      row_number: offset + idx + 1,
    }));
  }

  protected getLikeValue(value: string, like: WhereLike): string {
    return (like === WhereLike.StartsWith ? '' : '%') +
      value + (like === WhereLike.EndsWith ? '' : '%');
  }

  protected async getTotalCount(select: SelectQueryBuilder<any>) {
    const count = (
      await select.clone().select('count(1) as count').getRawOne()
    )['count'];
    return count;
  }
}

export enum WhereLike {
  Contains,
  StartsWith,
  EndsWith,
}

interface UnionParameters {
  sql: string;
  parameters: any[];
}
