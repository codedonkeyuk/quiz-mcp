import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import {
  quizDb,
  createTopic,
  deleteTopic,
  generateNewTest,
  submitTestAnswers,
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

  test("should handle the complete test lifecycle (generation to submission)", async () => {
    const payload = {
      topic_name: "Node.js Streams",
      questions: ["What is a Readable Stream?", "What does .pipe() do?"],
    };

    const newTest = await generateNewTest(dbInstance, payload);

    assert.ok(newTest.test_id, "Should generate a valid test ID");
    assert.ok(newTest.topic_id, "Should look up or generate a topic ID");
    assert.equal(
      newTest.questions.length,
      2,
      "Should create exactly two questions",
    );
    assert.equal(newTest.questions[0].question, "What is a Readable Stream?");

    const submissionPayload = {
      test_id: newTest.test_id,
      answers: [
        {
          question_id: newTest.questions[0].id,
          user_answer: "A stream you can read data from.",
          is_correct: true,
        },
        {
          question_id: newTest.questions[1].id,
          user_answer: "It attaches a Writable stream to a Readable stream.",
          is_correct: true,
        },
      ],
    };

    const result = await submitTestAnswers(dbInstance, submissionPayload);
    assert.deepEqual(
      result,
      { success: true },
      "Submission should report success",
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
