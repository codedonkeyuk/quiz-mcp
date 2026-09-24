import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import {
  quizDb,
  createTopic,
  deleteTopic,
  generateNewTest,
  submitAnswer,
} from "./quizDb.ts";

describe("Quiz Database Suite", () => {
  let dbInstance: any;

  before(async () => {
    dbInstance = await quizDb(":memory:");
  });

  test("should successfully create a new topic with a unique name", async () => {
    const topic = await createTopic(dbInstance, "TypeScript Basics");

    assert.ok(topic.id, "Topic should have a generated ID");
    assert.equal(topic.name, "TypeScript Basics");
  });

  test("should fail to create a topic with a duplicate name", async () => {
    await createTopic(dbInstance, "Unique Topic");

    await assert.rejects(async () => {
      await createTopic(dbInstance, "Unique Topic");
    }, /A topic with the name "Unique Topic" already exists\./);
  });

  test("should handle the complete test lifecycle sequentially (one-by-one)", async () => {
    const payload = {
      topic_name: "Node.js Streams",
      questions: ["What is a Readable Stream?", "What does .pipe() do?"],
    };

    // 1. Generate the fresh test
    const newTest = await generateNewTest(dbInstance, payload);

    assert.ok(newTest.test_id, "Should generate a valid test ID");
    assert.ok(newTest.topic_id, "Should look up or generate a topic ID");
    assert.equal(
      newTest.questions.length,
      2,
      "Should create exactly two questions",
    );
    assert.equal(newTest.questions[0].question, "What is a Readable Stream?");

    // 2. Submit the answer to the first question and expect the NEXT question back
    const step1 = await submitAnswer(dbInstance, {
      test_id: newTest.test_id,
      question_id: newTest.questions[0].id,
      user_answer: "A stream you can read data from.",
      is_correct: true,
    });

    assert.equal(
      step1.test_complete,
      false,
      "Test should not be complete after question 1",
    );
    assert.ok(step1.next_question, "Should return a next question object");
    assert.equal(step1.next_question.id, newTest.questions[1].id);
    assert.equal(step1.next_question.text, "What does .pipe() do?");

    // 3. Submit the answer to the second (and final) question and expect completion
    const step2 = await submitAnswer(dbInstance, {
      test_id: newTest.test_id,
      question_id: newTest.questions[1].id,
      user_answer: "It attaches a Writable stream to a Readable stream.",
      is_correct: true,
    });

    assert.equal(
      step2.test_complete,
      true,
      "Test should signal completion after final question",
    );
    assert.equal(
      step2.next_question,
      null,
      "Next question reference should be null upon completion",
    );

    // 4. Verify both rows were safely persisted in the test_answer table
    const storedAnswers = await dbInstance
      .selectFrom("test_answer")
      .selectAll()
      .where("test_id", "=", newTest.test_id)
      .execute();

    assert.equal(
      storedAnswers.length,
      2,
      "Should have stored exactly 2 database rows",
    );
    assert.equal(storedAnswers[0].question_id, newTest.questions[0].id);
    assert.equal(
      storedAnswers[1].answer,
      "It attaches a Writable stream to a Readable stream.",
    );
  });

  test("should cascade delete all elements when a topic is dropped", async () => {
    const topic = await createTopic(dbInstance, "Volatile Topic");

    const newTest = await generateNewTest(dbInstance, {
      topic_name: "Volatile Topic",
      questions: ["Will this survive a cascade drop?"],
    });

    await deleteTopic(dbInstance, topic.id);

    const testCheck = await dbInstance
      .selectFrom("test")
      .select(dbInstance.fn.count("id").as("count"))
      .where("id", "=", newTest.test_id)
      .executeTakeFirst();

    const questionCheck = await dbInstance
      .selectFrom("question")
      .select(dbInstance.fn.count("id").as("count"))
      .where("id", "=", newTest.questions[0].id)
      .executeTakeFirst();

    assert.equal(
      Number(testCheck?.count),
      0,
      "Test records should be deleted by cascade execution",
    );
    assert.equal(
      Number(questionCheck?.count),
      0,
      "Question records should be deleted by cascade execution",
    );
  });
});
