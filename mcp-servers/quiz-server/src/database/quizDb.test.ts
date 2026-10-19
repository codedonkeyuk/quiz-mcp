import { test, describe } from "node:test";
import assert from "node:assert";
import quizDb from "./quizDb.ts";

describe("quizDb Initialization", () => {
  test("should successfully boot an in-memory database and run migrations without errors", async () => {
    const db = await quizDb(":memory:");

    try {
      const tables = await db.introspection.getTables();
      const tableNames = tables.map((t) => t.name);

      assert.ok(tableNames.includes("topic"), "Missing 'topic' table");
      assert.ok(tableNames.includes("question"), "Missing 'question' table");
      assert.ok(tableNames.includes("test"), "Missing 'test' table");
      assert.ok(
        tableNames.includes("test_answer"),
        "Missing 'test_answer' table",
      );

      const testTable = tables.find((t) => t.name === "test");
      assert.ok(testTable, "Could not find 'test' metadata");

      const testColumns = testTable.columns.map((c) => c.name);
      assert.ok(
        testColumns.includes("number_questions"),
        "The patched 'number_questions' column was missing from the initialized schema",
      );

      const insertResult = await db
        .insertInto("topic")
        .values({ name: "Git Basics" })
        .executeTakeFirstOrThrow();

      assert.ok(insertResult.insertId !== undefined);

      const queriedTopic = await db
        .selectFrom("topic")
        .where("name", "=", "Git Basics")
        .select("name")
        .executeTakeFirst();

      assert.strictEqual(queriedTopic?.name, "Git Basics");
    } finally {
      await db.destroy();
    }
  });

  test("should successfully execute safely twice on the same reference without throwing errors due to ifNotExists", async () => {
    const db = await quizDb(":memory:");

    try {
      await assert.doesNotReject(async () => {
        await quizDb(":memory:");
      }, "Calling quizDb multiple times should not throw unique constraint or table existence errors");
    } finally {
      await db.destroy();
    }
  });
});
