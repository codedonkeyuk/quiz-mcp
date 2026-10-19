import { test, describe } from "node:test";
import assert from "node:assert";
import createTest from "./createTest.ts";
import quizDb from "./quizDb.ts";

describe("createTest", () => {
  test("should successfully create a test and select a random question", async () => {
    const db = await quizDb(":memory:");

    try {
      const topicResult = await db
        .insertInto("topic")
        .values({ name: "JavaScript" })
        .executeTakeFirstOrThrow();

      const topicId = Number(topicResult.insertId);

      await db
        .insertInto("question")
        .values([
          {
            topic_id: topicId,
            question: "What is a closure?",
            correct_answer: "A function that remembers its outer variables",
          },
          {
            topic_id: topicId,
            question: "Explain the event loop.",
            correct_answer: "A mechanism that handles asynchronous execution",
          },
        ])
        .execute();

      const result = await createTest(db, "JavaScript", 5);

      assert.ok(
        result.testId > 0,
        "Should return a valid auto-incremented test ID",
      );
      assert.ok(
        [1, 2, topicId, result.questionId].includes(result.questionId),
        "Should return a valid seeded question ID",
      );
      assert.ok(
        ["What is a closure?", "Explain the event loop."].includes(
          result.question,
        ),
        "Should return one of the seeded question bodies",
      );

      const savedTest = await db
        .selectFrom("test")
        .where("id", "=", result.testId)
        .selectAll()
        .executeTakeFirst();

      assert.ok(savedTest, "The test row should be saved in the database");
      assert.strictEqual(savedTest.topic_id, topicId);
      assert.strictEqual(savedTest.number_questions, 5);
    } finally {
      await db.destroy();
    }
  });

  test("should throw an error if the topic name does not exist", async () => {
    const db = await quizDb(":memory:");

    try {
      await assert.rejects(createTest(db, "MissingTopic", 10), /no result/i);
    } finally {
      await db.destroy();
    }
  });

  test("should throw an error if the topic has no questions", async () => {
    const db = await quizDb(":memory:");

    try {
      await db.insertInto("topic").values({ name: "EmptyTopic" }).execute();

      await assert.rejects(
        createTest(db, "EmptyTopic", 10),
        /Not enough questions available for the specified topic\./,
      );
    } finally {
      await db.destroy();
    }
  });
});
