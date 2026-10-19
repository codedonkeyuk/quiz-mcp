import { test, describe } from "node:test";
import assert from "node:assert";
import saveTestGrade from "./saveTestGrade.ts";
import quizDb from "./quizDb.ts";

describe("saveTestGrade", () => {
  test("should successfully update question feedback boolean states and write the final test grade", async () => {
    const db = await quizDb(":memory:");

    try {
      const topicResult = await db
        .insertInto("topic")
        .values({ name: "CSS Grid" })
        .executeTakeFirstOrThrow();
      const topicId = Number(topicResult.insertId);

      const questionResult = await db
        .insertInto("question")
        .values({
          topic_id: topicId,
          question: "What does fr stand for?",
          correct_answer: "Fractional unit",
        })
        .executeTakeFirstOrThrow();
      const questionId = Number(questionResult.insertId);

      const testResult = await db
        .insertInto("test")
        .values({
          topic_id: topicId,
          date: new Date().toISOString(),
          number_questions: 2,
        })
        .executeTakeFirstOrThrow();
      const testId = Number(testResult.insertId);

      const ans1Result = await db
        .insertInto("test_answer")
        .values({
          test_id: testId,
          question_id: questionId,
          answer: "Fractional unit",
          correct: 0 as any,
        })
        .executeTakeFirstOrThrow();

      const ans2Result = await db
        .insertInto("test_answer")
        .values({
          test_id: testId,
          question_id: questionId,
          answer: "Wrong answer string value",
          correct: 0 as any,
        })
        .executeTakeFirstOrThrow();

      const answer1Id = Number(ans1Result.insertId);
      const answer2Id = Number(ans2Result.insertId);

      const feedbackPayload = [
        { answerId: answer1Id, correct: true },
        { answerId: answer2Id, correct: false },
      ];

      await saveTestGrade(db, testId, 85, feedbackPayload);

      const updatedTest = await db
        .selectFrom("test")
        .where("id", "=", testId)
        .select("grade")
        .executeTakeFirst();

      assert.ok(
        updatedTest,
        "The test record tracking row should be accessible.",
      );
      assert.strictEqual(
        Number(updatedTest.grade),
        85,
        "The final grade column update failed.",
      );

      const firstAnswerRecord = await db
        .selectFrom("test_answer")
        .where("id", "=", answer1Id)
        .select("correct")
        .executeTakeFirst();

      const secondAnswerRecord = await db
        .selectFrom("test_answer")
        .where("id", "=", answer2Id)
        .select("correct")
        .executeTakeFirst();

      assert.strictEqual(
        Number(firstAnswerRecord?.correct),
        1,
        "The true boolean condition did not save as 1.",
      );
      assert.strictEqual(
        Number(secondAnswerRecord?.correct),
        0,
        "The false boolean condition did not save as 0.",
      );
    } finally {
      await db.destroy();
    }
  });

  test("should complete safely without errors when given an empty answersFeedback collection", async () => {
    const db = await quizDb(":memory:");

    try {
      const topicResult = await db
        .insertInto("topic")
        .values({ name: "HTML5" })
        .executeTakeFirstOrThrow();
      const testResult = await db
        .insertInto("test")
        .values({
          topic_id: Number(topicResult.insertId),
          date: new Date().toISOString(),
          number_questions: 0,
        })
        .executeTakeFirstOrThrow();
      const testId = Number(testResult.insertId);

      await assert.doesNotReject(saveTestGrade(db, testId, 100, []));

      const updatedTest = await db
        .selectFrom("test")
        .where("id", "=", testId)
        .select("grade")
        .executeTakeFirst();

      assert.strictEqual(Number(updatedTest?.grade), 100);
    } finally {
      await db.destroy();
    }
  });
});
