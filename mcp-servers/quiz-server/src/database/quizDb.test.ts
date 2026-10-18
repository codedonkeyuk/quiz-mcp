import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import {
  quizDb,
  createTestKnowledge,
  createTest,
  submitAnswer,
  saveTestGrade,
} from "./quizDb.ts";

describe("Quiz System End-to-End Lifecycle", () => {
  let dbInstance: any;

  before(async () => {
    dbInstance = await quizDb(":memory:");
  });

  test("should execute the complete lifecycle: creation, answering loop, and external LLM grading", async () => {
    const mockTopicData = {
      name: "TypeScript Generics",
      questions: [
        {
          question: "What does <T> represent in a function definition?",
          correct_answer: "A generic type placeholder parameter.",
        },
        {
          question:
            "How do you constrain a generic type to a specific structure?",
          correct_answer: "Using the extends keyword.",
        },
      ],
    };

    await createTestKnowledge(dbInstance, mockTopicData);

    const storedTopic = await dbInstance
      .selectFrom("topic")
      .where("name", "=", "TypeScript Generics")
      .select("id")
      .executeTakeFirstOrThrow();

    assert.ok(storedTopic.id, "Topic should be written to the database");

    const testSession = await createTest(dbInstance, "TypeScript Generics", 2);

    assert.ok(
      testSession.testId,
      "Should generate a valid test configuration instance",
    );
    assert.ok(
      testSession.questionId,
      "Should provide an initial question ID to display",
    );
    assert.ok(
      testSession.question,
      "Should yield the text of the first question",
    );

    const firstQuestionId = testSession.questionId;

    const round1Result = await submitAnswer(dbInstance, {
      testId: testSession.testId,
      questionId: firstQuestionId,
      answer: "It is a placeholder for a type passed at runtime.",
    });

    assert.equal(
      round1Result.status,
      "next_question",
      "Should transition cleanly to the next question state",
    );
    assert.ok(
      round1Result.nextQuestion,
      "Should return the next question package",
    );
    assert.notEqual(
      round1Result.nextQuestion.id,
      firstQuestionId,
      "Should deduplicate and pick the remaining question",
    );

    const secondQuestionId = round1Result.nextQuestion.id;

    const round2Result = await submitAnswer(dbInstance, {
      testId: testSession.testId,
      questionId: secondQuestionId,
      answer: "By typing it out with the extends constraint parameter.",
    });

    assert.equal(
      round2Result.status,
      "completed",
      "Should close the cycling loop when total question boundaries are satisfied",
    );

    assert.ok(
      round2Result.evaluationPayload,
      "Must bundle up full test history context blocks for immediate LLM processing",
    );

    assert.equal(
      round2Result.evaluationPayload.length,
      2,
      "Evaluation payload must contain exactly 2 question tracking structures",
    );

    const firstPayloadItem = round2Result.evaluationPayload[0];
    assert.ok(
      firstPayloadItem.answer_id,
      "Payload rows require reference entity IDs",
    );
    assert.ok(
      firstPayloadItem.question,
      "Payload rows require original prompt context text strings",
    );
    assert.ok(
      firstPayloadItem.reference_answer,
      "Payload rows must display verification answers",
    );
    assert.ok(
      firstPayloadItem.user_answer,
      "Payload rows must display recorded customer replies",
    );

    const match1 = round2Result.evaluationPayload.find(
      (item) => item.question === mockTopicData.questions[0].question,
    );
    const match2 = round2Result.evaluationPayload.find(
      (item) => item.question === mockTopicData.questions[1].question,
    );

    assert.ok(match1, "First answer must be found in payload");
    assert.ok(match2, "Second answer must be found in payload");

    const firstAnswerId = match1.answer_id;
    const secondAnswerId = match2.answer_id;

    const simulatedLlmFeedback = [
      { answerId: firstAnswerId, correct: true },
      { answerId: secondAnswerId, correct: false },
    ];
    const simulatedLlmGradeScore = 50;

    await saveTestGrade(
      dbInstance,
      testSession.testId,
      simulatedLlmGradeScore,
      simulatedLlmFeedback,
    );

    const updatedTestRecord = await dbInstance
      .selectFrom("test")
      .where("id", "=", testSession.testId)
      .select("grade")
      .executeTakeFirstOrThrow();

    assert.equal(
      updatedTestRecord.grade,
      50,
      "The test row should now store the final grading metric submitted by the evaluation layer",
    );

    const updatedAnswers = await dbInstance
      .selectFrom("test_answer")
      .where("test_id", "=", testSession.testId)
      .select(["id", "correct"])
      .execute();

    const verifiedFirstAnswer = updatedAnswers.find(
      (a: any) => a.id === firstAnswerId,
    );
    const verifiedSecondAnswer = updatedAnswers.find(
      (a: any) => a.id === secondAnswerId,
    );

    assert.equal(
      verifiedFirstAnswer.correct,
      1,
      "First question should be updated to true (1)",
    );
    assert.equal(
      verifiedSecondAnswer.correct,
      0,
      "Second question should be updated to false (0)",
    );
  });
});
