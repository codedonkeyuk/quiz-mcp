import Database from "better-sqlite3";
import {
  Kysely,
  SqliteDialect,
  CreateTableBuilder,
  ColumnDefinitionBuilder,
} from "kysely";

export type DecoratedSchemaBuilder<Schema> = {
  createTable<TB extends keyof Schema & string>(
    tableName: TB,
  ): Omit<CreateTableBuilder<TB, never>, "addColumn"> & {
    addColumn<C extends keyof Schema[TB] & string>(
      columnName: C,
      dataType: string,
      callback?: (builder: ColumnDefinitionBuilder) => ColumnDefinitionBuilder,
    ): any;
  };
};

export async function db<T = any>(
  path: string = "/app/data/database.sqlite",
  setup?: (
    schema: DecoratedSchemaBuilder<T>,
    rawDb: Kysely<T>,
  ) => Promise<void>,
): Promise<Kysely<T>> {
  const nativeDb = new Database(path, { timeout: 5000 });
  nativeDb.pragma("journal_mode = WAL");
  nativeDb.pragma("synchronous = NORMAL");

  const connection = new Kysely<T>({
    dialect: new SqliteDialect({
      database: nativeDb,
    }),
  });

  if (setup) {
    const decoratedSchema =
      connection.schema as unknown as DecoratedSchemaBuilder<T>;
    await setup(decoratedSchema, connection);
  }

  return connection;
}
