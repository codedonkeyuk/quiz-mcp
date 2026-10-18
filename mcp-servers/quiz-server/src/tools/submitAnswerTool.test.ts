import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("submitAnswerTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    namedExports: {
      quizDb: async () => ({ isMockDb: true }),
      submitAnswer: async (
        _db: Kysely<DbSchema>,
        params: { testId: number; questionId: number; answer: string },
      ) => {
        if (params.testId === 999) {
          throw new Error(
            "No remaining unanswered questions left for this topic.",
          );
        }

        if (params.testId === 200) {
          return {
            status: "completed" as const,
            evaluationPayload: [
              {
                answer_id: 1,
                question: "What is a structural type?",
                reference_answer: "Type checking based on shape",
                user_answer: params.answer,
              },
            ],
          };
        }

        return {
          status: "next_question" as const,
          nextQuestion: {
            id: 46,
            question: "Explain unknown vs any",
          },
        };
      },
    },
  });

  const { submitAnswerTool } = await import("./submitAnswerTool.ts");

  await t.test(
    "successfully submits answer and moves to the next question",
    async () => {
      const inputPayload = {
        test_id: 100,
        question_id: 45,
        answer: "Testing structural shape checking.",
      };

      const mcpResponse = await submitAnswerTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "next_question");
      assert.strictEqual(result.next_question.id, 46);
      assert.strictEqual(
        result.next_question.question,
        "Explain unknown vs any",
      );
    },
  );

  await t.test(
    "successfully completes the test and returns evaluation data",
    async () => {
      const inputPayload = {
        test_id: 200,
        question_id: 45,
        answer: "Testing final answer submission.",
      };

      const mcpResponse = await submitAnswerTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "completed");
      assert.match(result.message, /Test completed/);
      assert.strictEqual(result.evaluation_payload.length, 1);

      assert.strictEqual(
        result.evaluation_payload[0].user_answer,
        "Testing final answer submission.",
      );
    },
  );

  await t.test(
    "handles quiz errors gracefully when matching questions fails",
    async () => {
      const inputPayload = {
        test_id: 999,
        question_id: 45,
        answer: "Edge case answer.",
      };

      const mcpResponse = await submitAnswerTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, false);
      assert.match(result.error, /No remaining unanswered questions/);
    },
  );
});
