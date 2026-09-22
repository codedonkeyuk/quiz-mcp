import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { quizDb } from "../database/quizDb.ts"; // Adjust path
import { createTopicTool } from "./createTopic.ts"; // Adjust path

describe("createTopicTool Integration Tests", () => {
  let dbInstance: any;

  before(async () => {
    dbInstance = await quizDb(":memory:");
  });

  test("should successfully create a brand new topic category", async () => {
    const args = {
      name: "Rust Fundamentals",
      ctx: { db: dbInstance },
    };

    const rawResult: any = await createTopicTool.execute(args, {});

    // FIXED: Removed the invalid duplicate question mark typo (`?.?`)
    const jsonString =
      typeof rawResult === "string"
        ? rawResult
        : rawResult?.content?.[0]?.text ||
          rawResult?.text ||
          JSON.stringify(rawResult);

    const result = JSON.parse(jsonString);

    assert.equal(result.success, true);
    assert.equal(result.name, "Rust Fundamentals");
    assert.ok(
      result.topic_id,
      "Should return a valid auto-incremented primary key id",
    );
  });

  test("should gracefully catch database errors if inserting a duplicate name", async () => {
    const args = {
      name: "Duplicate Topic",
      ctx: { db: dbInstance },
    };

    // First attempt creates it successfully
    await createTopicTool.execute(args, {});

    // Second attempt hits your internal try/catch block
    const rawResult: any = await createTopicTool.execute(args, {});

    // FIXED: Clean extraction layout here as well
    const jsonString =
      typeof rawResult === "string"
        ? rawResult
        : rawResult?.content?.[0]?.text ||
          rawResult?.text ||
          JSON.stringify(rawResult);

    const result = JSON.parse(jsonString);

    assert.equal(result.success, false);
    assert.match(result.error, /already exists/);
  });
});
