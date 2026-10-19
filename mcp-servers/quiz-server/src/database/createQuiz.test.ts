import { test, describe } from "node:test";
import assert from "node:assert";
import createTestKnowledge from "./createQuiz.ts";
import quizDb from "./quizDb.ts";

describe("createTestKnowledge", () => {
  test("should successfully insert a new topic along with its questions", async () => {
    const db = await quizDb(":memory:");

    try {
      const testData = {
        name: "Docker Essentials",
        questions: [
          {
            question: "What is an image layers concept?",
            correct_answer: "Read-only templates used to spin up instances.",
          },
          {
            question: "What does the EXPOSE instruction do?",
            correct_answer: "It functions as documentation for incoming ports.",
          },
        ],
      };

      await createTestKnowledge(db, testData);

      const persistedTopic = await db
        .selectFrom("topic")
        .where("name", "=", "Docker Essentials")
        .select(["id", "name"])
        .executeTakeFirst();

      assert.ok(
        persistedTopic,
        "The targeted topic should exist in the database.",
      );
      assert.strictEqual(persistedTopic.name, "Docker Essentials");

      const persistedQuestions = await db
        .selectFrom("question")
        .where("topic_id", "=", Number(persistedTopic.id))
        .select(["question", "correct_answer"])
        .execute();

      assert.strictEqual(
        persistedQuestions.length,
        2,
        "Should have inserted exactly 2 questions.",
      );
      assert.deepStrictEqual(persistedQuestions, [
        {
          question: "What is an image layers concept?",
          correct_answer: "Read-only templates used to spin up instances.",
        },
        {
          question: "What does the EXPOSE instruction do?",
          correct_answer: "It functions as documentation for incoming ports.",
        },
      ]);
    } finally {
      await db.destroy();
    }
  });

  test("should throw an error if the topic insertion violates a unique name constraint", async () => {
    const db = await quizDb(":memory:");

    try {
      await db
        .insertInto("topic")
        .values({ name: "DuplicateTopic" })
        .executeTakeFirstOrThrow();

      const conflictingPayload = {
        name: "DuplicateTopic",
        questions: [{ question: "Valid question?", correct_answer: "Yes" }],
      };

      await assert.rejects(
        createTestKnowledge(db, conflictingPayload),
        /SQLite error|constraint failed|already exists/i,
      );
    } finally {
      await db.destroy();
    }
  });
});
