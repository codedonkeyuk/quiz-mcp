import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("submitTestAnswerTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    namedExports: {
      quizDb: async () => ({ isMockDb: true }),
      submitAnswer: async (
        _db: Kysely<DbSchema>,
        payload: {
          test_id: number;
          question_id: number;
          user_answer: string;
          is_correct: boolean;
        },
      ) => {
        if (payload.test_id === 999) {
          throw new Error(
            "Failed to write single submission record to database",
          );
        }

        if (payload.question_id === 1) {
          return {
            test_complete: false,
            next_question: {
              id: 2,
              text: "What does .pipe() do?",
            },
          };
        }

        return {
          test_complete: true,
          next_question: null,
        };
      },
    },
  });

  const { submitTestAnswerTool } = await import("./submitTestAnswerTool.ts");

  await t.test(
    "successfully records single answer and yields the next question string",
    async () => {
      const inputPayload = {
        test_id: 101,
        question_id: 1,
        user_answer: "ECMAScript Modules",
        is_correct: true,
      };

      const mcpResponse = await submitTestAnswerTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.test_complete, false);
      assert.deepEqual(result.next_question, {
        id: 2,
        text: "What does .pipe() do?",
      });
    },
  );

  await t.test(
    "successfully records final answer and signals test completion",
    async () => {
      const inputPayload = {
        test_id: 101,
        question_id: 2,
        user_answer: "CommonJS Modules",
        is_correct: false,
      };

      const mcpResponse = await submitTestAnswerTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.test_complete, true);
      assert.strictEqual(result.next_question, null);
    },
  );

  await t.test(
    "handles infrastructure errors gracefully when record writing fails",
    async () => {
      const inputPayload = {
        test_id: 999,
        question_id: 1,
        user_answer: "Trigger Database Error",
        is_correct: false,
      };

      const mcpResponse = await submitTestAnswerTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, false);
      assert.match(result.error, /Failed to write single submission record/);
    },
  );
});
