import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("createQuizTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    defaultExport: async () => ({ isMockDb: true }),
  });

  mock.module("../database/createQuiz.ts", {
    defaultExport: async (
      _db: Kysely<DbSchema>,
      payload: {
        name: string;
        questions: { question: string; correct_answer: string }[];
      },
    ) => {
      if (payload.name === "Trigger Error") {
        throw new Error("Failed to insert topic.");
      }
      return;
    },
  });

  const { createQuizTool } = await import("./createQuizTool.ts");

  await t.test(
    "successfully saves topic and questions to knowledge base",
    async () => {
      const inputPayload = {
        name: "TypeScript Basics",
        questions: [
          {
            question: "What is a structural type?",
            correct_answer: "Type checking based on shape",
          },
          {
            question: "Explain unknown vs any",
            correct_answer: "unknown is type-safe; any turns off checking",
          },
        ],
      };

      const mcpResponse = await createQuizTool.execute(inputPayload);
      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, true);
      assert.match(result.message, /added to the knowledge base successfully/);
    },
  );

  await t.test(
    "handles database errors gracefully when insertion fails",
    async () => {
      const inputPayload = {
        name: "Trigger Error",
        questions: [{ question: "Will this fail?", correct_answer: "Yes" }],
      };

      const mcpResponse = await createQuizTool.execute(inputPayload);
      const result = JSON.parse(mcpResponse.content[0].text);

      assert.strictEqual(result.success, false);
      assert.match(result.error, /Failed to insert topic/);
    },
  );
});
