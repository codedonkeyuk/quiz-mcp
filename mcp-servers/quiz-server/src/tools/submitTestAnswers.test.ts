import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("submitTestAnswersTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    namedExports: {
      quizDb: async () => ({ isMockDb: true }),
      submitTestAnswers: async (
        _db: Kysely<DbSchema>,
        payload: {
          test_id: number;
          answers: Array<{
            question_id: number;
            user_answer: string;
            is_correct: boolean;
          }>;
        },
      ) => {
        if (payload.test_id === 999) {
          throw new Error("Failed to write submission records to database");
        }
        return;
      },
    },
  });

  const { submitTestAnswersTool } = await import("./submitTestAnswers.ts");

  await t.test("successfully submits test answers", async () => {
    const inputPayload = {
      test_id: 101,
      answers: [
        { question_id: 1, user_answer: "ECMAScript Modules", is_correct: true },
        { question_id: 2, user_answer: "CommonJS", is_correct: false },
      ],
    };

    const mcpResponse = await submitTestAnswersTool.execute(inputPayload);

    const result = JSON.parse(mcpResponse.content[0].text);

    assert.strictEqual(result.success, true);
    assert.match(result.message, /All answers have been successfully tracked/);
  });

  await t.test("handles errors gracefully when submission fails", async () => {
    const inputPayload = {
      test_id: 999,
      answers: [
        { question_id: 1, user_answer: "Trigger Error", is_correct: false },
      ],
    };

    const mcpResponse = await submitTestAnswersTool.execute(inputPayload);

    const result = JSON.parse(mcpResponse.content[0].text);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /Failed to write submission records/);
  });
});
