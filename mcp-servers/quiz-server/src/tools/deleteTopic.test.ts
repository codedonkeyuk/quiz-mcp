import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { quizDb, createTopic } from "../database/quizDb.ts"; // Adjust path
import { deleteTopicTool } from "./deleteTopic.ts"; // Adjust path

describe("deleteTopicTool Integration Tests", () => {
  let dbInstance: any;

  before(async () => {
    dbInstance = await quizDb(":memory:");
  });

  test("should successfully delete an existing topic category", async () => {
    const seedTopic = await createTopic(dbInstance, "Temporary Topic");

    const args = {
      id: seedTopic.id,
      ctx: { db: dbInstance },
    };

    const rawResult: any = await deleteTopicTool.execute(args, {});

    const jsonString =
      typeof rawResult === "string"
        ? rawResult
        : rawResult?.content?.[0]?.text ||
          rawResult?.text ||
          JSON.stringify(rawResult);

    const result = JSON.parse(jsonString);

    assert.equal(result.success, true);
    assert.match(result.message, /successfully deleted/);

    const checkRow = await dbInstance
      .selectFrom("topic")
      .selectAll()
      .where("id", "=", seedTopic.id)
      .executeTakeFirst();

    assert.equal(
      checkRow,
      undefined,
      "The topic row should no longer exist in the database table",
    );
  });
});
