import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { quizDb, generateNewTest } from "../database/quizDb.ts"; // Adjust path
import { submitTestAnswersTool } from "./submitTestAnswers.ts"; // Adjust path

describe("submitTestAnswersTool Integration Tests", () => {
  let dbInstance: any;
  let testId: number;
  let questionId: number;

  before(async () => {
    // 1. Initialize empty in-memory test database
    dbInstance = await quizDb(":memory:");

    // 2. Seed a test and question so we have valid foreign keys to target
    const seededData = await generateNewTest(dbInstance, {
      topic_name: "TypeScript Generics",
      questions: ["What is T in <T>?"],
    });

    testId = seededData.test_id;
    questionId = seededData.questions[0].id;
  });

  test("should successfully execute tool, write answers, and return a success JSON string", async () => {
    // Arrange: Build arguments matching your tool's signature format
    const args = {
      test_id: testId,
      answers: [
        {
          question_id: questionId,
          user_answer: "It stands for a generic Type parameter.",
          is_correct: true,
        },
      ],
      ctx: {
        db: dbInstance,
      },
    };

    // Act: Run the wrapped execute block
    const rawResult: any = await submitTestAnswersTool.execute(args, {});

    // Extract string value regardless of whether wrapExecution returns a primitive string or an object wrapper
    const jsonString =
      typeof rawResult === "string"
        ? rawResult
        : rawResult?.content?.[0]?.text ||
          rawResult?.text ||
          JSON.stringify(rawResult);

    const result = JSON.parse(jsonString);

    // Assert: Verify the tool responded with the expected structure
    assert.equal(result.success, true);
    assert.equal(
      result.message,
      "All answers have been successfully tracked and recorded.",
    );

    // Direct Database Verification: Confirm data actually landed inside the table
    const storedAnswers = await dbInstance
      .selectFrom("test_answer")
      .selectAll()
      .where("test_id", "=", testId)
      .execute();

    assert.equal(
      storedAnswers.length,
      1,
      "There should be exactly one stored answer in the table",
    );
    assert.equal(storedAnswers[0].question_id, questionId);
    assert.equal(
      storedAnswers[0].answer,
      "It stands for a generic Type parameter.",
    );

    // Account for SQLite driver casting differences dynamically (boolean vs 1/0 integer conversion)
    assert.ok(
      storedAnswers[0].correct === true || storedAnswers[0].correct === 1,
      "The answer correctness column should track true or 1",
    );
  });
});
