import assert from "node:assert";
import { test } from "node:test";
import { sql } from "kysely";
import { db } from "./index.ts";

test("Database initialization with memory_mode", async () => {
  const testee = await db<any>(":memory:");

  const result = await sql<{ count: number }>`SELECT 1 AS count`.execute(
    testee,
  );

  assert.strictEqual(result.rows[0].count, 1);
});

test("Database initialization with injected setup schema", async () => {
  interface SetupTestSchema {
    test_table: {
      id: string;
      status: string;
    };
  }

  const testee = await db<SetupTestSchema>(":memory:", async (schema) => {
    await schema
      .createTable("test_table")
      .ifNotExists()
      .addColumn("id", "text", (cb) => cb.primaryKey())
      .addColumn("status", "text", (cb) => cb.notNull())
      .execute();
  });

  await testee
    .insertInto("test_table")
    .values({ id: "123", status: "active" })
    .execute();

  const row = await testee
    .selectFrom("test_table")
    .selectAll()
    .executeTakeFirst();

  assert.strictEqual(row?.id, "123");
  assert.strictEqual(row?.status, "active");
});
