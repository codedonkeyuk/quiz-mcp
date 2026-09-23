import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("generateNewTestTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    namedExports: {
      quizDb: async () => ({ isMockDb: true }),
      generateNewTest: async (
        _db: Kysely<DbSchema>,
        payload: { topic_name: string; questions: string[] },
      ) => {
        if (payload.topic_name === "Trigger Error") {
          throw new Error("Failed to insert test records into database");
        }

        return {
          test_id: "test-abc-123",
          topic_id: "topic-xyz-789",
          questions: payload.questions.map((q, idx) => ({
            id: `q-${idx}`,
            text: q,
          })),
        };
      },
    },
  });

  const { generateNewTestTool } = await import("./generateNewTest.ts");

  await t.test("successfully generates a new test", async () => {
    const inputPayload = {
      topic_name: "TypeScript Basics",
      questions: ["What is a structural type?", "Explain unknown vs any"],
    };

    const mcpResponse = await generateNewTestTool.execute(inputPayload);

    const result = JSON.parse(mcpResponse.content[0].text);

    assert.match(result.message, /Test created successfully/);
    assert.strictEqual(result.test_id, "test-abc-123");
    assert.strictEqual(result.topic_id, "topic-xyz-789");
    assert.strictEqual(result.questions.length, 2);
    assert.strictEqual(result.questions[0].text, "What is a structural type?");
  });

  await t.test("handles errors gracefully when generation fails", async () => {
    const inputPayload = {
      topic_name: "Trigger Error",
      questions: ["Will this fail?"],
    };

    const mcpResponse = await generateNewTestTool.execute(inputPayload);

    const result = JSON.parse(mcpResponse.content[0].text);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /Failed to insert test records/);
  });
});
