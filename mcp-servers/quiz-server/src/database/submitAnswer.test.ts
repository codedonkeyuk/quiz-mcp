import { test, describe } from "node:test";
import assert from "node:assert";
import submitAnswer from "./submitAnswer.ts";
import quizDb from "./quizDb.ts";

describe("submitAnswer", () => {
  test("should advance to 'next_question' status when the test limits are not yet met", async () => {
    const db = await quizDb(":memory:");

    try {
      const topicResult = await db
        .insertInto("topic")
        .values({ name: "Git Fundamentals" })
        .executeTakeFirstOrThrow();
      const topicId = Number(topicResult.insertId);

      const q1 = await db
        .insertInto("question")
        .values({
          topic_id: topicId,
          question: "What is a commit?",
          correct_answer: "Snapshot",
        })
        .executeTakeFirstOrThrow();
      const q2 = await db
        .insertInto("question")
        .values({
          topic_id: topicId,
          question: "What is rebase?",
          correct_answer: "Forward port",
        })
        .executeTakeFirstOrThrow();
      const q3 = await db
        .insertInto("question")
        .values({
          topic_id: topicId,
          question: "What is cherry-pick?",
          correct_answer: "Apply commit",
        })
        .executeTakeFirstOrThrow();

      const q1Id = Number(q1.insertId);
      const q2Id = Number(q2.insertId);
      const q3Id = Number(q3.insertId);

      const testResult = await db
        .insertInto("test")
        .values({
          topic_id: topicId,
          date: new Date().toISOString(),
          number_questions: 2,
        })
        .executeTakeFirstOrThrow();
      const testId = Number(testResult.insertId);

      const result = await submitAnswer(db, {
        testId,
        questionId: q1Id,
        answer: "A code snapshot",
      });

      assert.strictEqual(result.status, "next_question");
      assert.ok(result.nextQuestion);
      assert.ok(
        [q2Id, q3Id].includes(result.nextQuestion.id),
        "Should only pick from remaining unsubmitted questions",
      );
      assert.ok(
        ["What is rebase?", "What is cherry-pick?"].includes(
          result.nextQuestion.question,
        ),
      );

      const savedAnswer = await db
        .selectFrom("test_answer")
        .where("test_id", "=", testId)
        .selectAll()
        .execute();
      assert.strictEqual(savedAnswer.length, 1);
      assert.strictEqual(savedAnswer[0].answer, "A code snapshot");
    } finally {
      await db.destroy();
    }
  });

  test("should transition to 'completed' status and return payload when all answers are submitted", async () => {
    const db = await quizDb(":memory:");

    try {
      const topicResult = await db
        .insertInto("topic")
        .values({ name: "Docker basics" })
        .executeTakeFirstOrThrow();
      const topicId = Number(topicResult.insertId);

      const q1 = await db
        .insertInto("question")
        .values({
          topic_id: topicId,
          question: "What is a container?",
          correct_answer: "An isolated process",
        })
        .executeTakeFirstOrThrow();
      const q1Id = Number(q1.insertId);

      const testResult = await db
        .insertInto("test")
        .values({
          topic_id: topicId,
          date: new Date().toISOString(),
          number_questions: 1,
        })
        .executeTakeFirstOrThrow();
      const testId = Number(testResult.insertId);

      const result = await submitAnswer(db, {
        testId,
        questionId: q1Id,
        answer: "Running process wrapper",
      });

      assert.strictEqual(result.status, "completed");
      assert.ok("evaluationPayload" in result);
      assert.strictEqual(result.evaluationPayload.length, 1);

      const evalItem = result.evaluationPayload[0];
      assert.strictEqual(evalItem.question, "What is a container?");
      assert.strictEqual(evalItem.reference_answer, "An isolated process");
      assert.strictEqual(evalItem.user_answer, "Running process wrapper");
      assert.ok(evalItem.answer_id > 0);
    } finally {
      await db.destroy();
    }
  });

  test("should throw an error when running out of unanswered database entries before matching limits", async () => {
    const db = await quizDb(":memory:");

    try {
      const topicResult = await db
        .insertInto("topic")
        .values({ name: "Scarcity" })
        .executeTakeFirstOrThrow();
      const topicId = Number(topicResult.insertId);

      const q1 = await db
        .insertInto("question")
        .values({
          topic_id: topicId,
          question: "Single question?",
          correct_answer: "Yes",
        })
        .executeTakeFirstOrThrow();
      const q1Id = Number(q1.insertId);

      const testResult = await db
        .insertInto("test")
        .values({
          topic_id: topicId,
          date: new Date().toISOString(),
          number_questions: 5,
        })
        .executeTakeFirstOrThrow();
      const testId = Number(testResult.insertId);

      await assert.rejects(
        submitAnswer(db, { testId, questionId: q1Id, answer: "Yes" }),
        /No remaining unanswered questions left for this topic\./,
      );
    } finally {
      await db.destroy();
    }
  });
});
