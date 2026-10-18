import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("saveTestGradeTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    namedExports: {
      quizDb: async () => ({ isMockDb: true }),
      saveTestGrade: async (
        _db: Kysely<DbSchema>,
        testId: number,
        _finalGrade: number,
        _answersFeedback: { answerId: number; correct: boolean }[],
      ) => {
        if (testId === 999) {
          throw new Error("Failed to update test metrics repository.");
        }
        return;
      },
    },
  });

  const { saveTestGradeTool } = await import("./saveTestGradeTool.ts");

  await t.test(
    "successfully updates database with test grade and answer flags",
    async () => {
      const inputPayload = {
        test_id: 100,
        final_grade: 85,
        answers_feedback: [
          { answerId: 1, correct: true },
          { answerId: 2, correct: false },
        ],
      };

      const mcpResponse = await saveTestGradeTool.execute(inputPayload);

      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, true);
      assert.match(result.message, /stored successfully/);
    },
  );

  await t.test("handles update database failures gracefully", async () => {
    const inputPayload = {
      test_id: 999,
      final_grade: 50,
      answers_feedback: [{ answerId: 1, correct: false }],
    };

    const mcpResponse = await saveTestGradeTool.execute(inputPayload);

    const result = JSON.parse(mcpResponse.content[0].text);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /Failed to update test metrics/);
  });
});
