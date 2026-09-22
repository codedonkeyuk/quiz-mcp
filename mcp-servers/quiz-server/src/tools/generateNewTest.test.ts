import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { quizDb } from "../database/quizDb.ts";
import { generateNewTestTool } from "./generateNewTest.ts";

describe("generateNewTestTool Integration Tests", () => {
  let dbInstance: any;

  before(async () => {
    dbInstance = await quizDb(":memory:");
  });

  test("should successfully execute tool, write payload to database, and return formatted JSON string", async () => {
    const args = {
      topic_name: "Docker Basics",
      questions: [
        "What is the difference between an image and a container?",
        "How do you expose a port in a Dockerfile?",
      ],
      ctx: {
        db: dbInstance,
      },
    };

    const rawResult: any = await generateNewTestTool.execute(args, {});

    const jsonString =
      typeof rawResult === "string"
        ? rawResult
        : rawResult?.content?.[0]?.text ||
          rawResult?.text ||
          JSON.stringify(rawResult);

    const result = JSON.parse(jsonString);

    assert.equal(
      result.message,
      "Test created successfully. Please present these questions to the user.",
    );
    assert.ok(
      result.test_id,
      "Result object should contain a generated test_id",
    );
    assert.ok(
      result.topic_id,
      "Result object should contain a generated topic_id",
    );
    assert.equal(
      result.questions.length,
      2,
      "Should have tracked exactly 2 questions in database",
    );
    assert.equal(
      result.questions[0].question,
      "What is the difference between an image and a container?",
    );
  });
});
