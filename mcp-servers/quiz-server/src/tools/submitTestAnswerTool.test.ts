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
            score: null,
          };
        }

        return {
          test_complete: true,
          next_question: null,
          score: {
            total: 2,
            correct: 1,
            percentage: 50,
          },
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

      // Accessing index 0 of the content array inside the wrapExecution output payload
      const textOutput = mcpResponse.content[0].text;

      assert.match(textOutput, /What does \.pipe\(\) do\?/);
    },
  );

  await t.test(
    "successfully records final answer and signals test completion with scorecard metrics",
    async () => {
      const inputPayload = {
        test_id: 101,
        question_id: 2,
        user_answer: "CommonJS Modules",
        is_correct: false,
      };

      const mcpResponse = await submitTestAnswerTool.execute(inputPayload);

      const textOutput = mcpResponse.content[0].text;

      assert.match(textOutput, /You have completed the quiz!/);
      assert.match(textOutput, /Final Scorecard:/);
      assert.match(textOutput, /Correct Answers: 1 \/ 2/);
      assert.match(textOutput, /Score: 50%/);
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

      const textOutput = mcpResponse.content[0].text;

      assert.match(textOutput, /Error processing answer submission:/);
      assert.match(textOutput, /Failed to write single submission record/);
    },
  );
});
