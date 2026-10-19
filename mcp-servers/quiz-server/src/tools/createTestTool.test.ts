import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("createTestTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    defaultExport: async () => ({ isMockDb: true }),
  });

  mock.module("../database/createTest.ts", {
    defaultExport: async (
      _db: Kysely<DbSchema>,
      topicName: string,
      _numberOfQuestions: number,
    ) => {
      if (topicName === "Trigger Error") {
        throw new Error(
          "Not enough questions available for the specified topic.",
        );
      }

      return {
        question: "What is a structural type?",
        questionId: 45,
        testId: 101,
      };
    },
  });

  const { createTestTool } = await import("./createTestTool.ts");

  await t.test(
    "successfully creates a test instance and retrieves the first question",
    async () => {
      const inputPayload = {
        topic_name: "TypeScript Basics",
        number_of_questions: 5,
      };

      const mcpResponse = await createTestTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, true);
      assert.match(result.message, /Test initiated successfully/);
      assert.strictEqual(result.question, "What is a structural type?");
      assert.strictEqual(result.question_id, 45);
      assert.strictEqual(result.test_id, 101);
    },
  );

  await t.test(
    "handles validation/database errors gracefully when initialization fails",
    async () => {
      const inputPayload = {
        topic_name: "Trigger Error",
        number_of_questions: 10,
      };

      const mcpResponse = await createTestTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, false);
      assert.match(result.error, /Not enough questions available/);
    },
  );
});
