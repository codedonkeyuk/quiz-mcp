import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("deleteTopicTool.execute", async (t) => {
  mock.module("../database/quizDb.ts", {
    namedExports: {
      quizDb: async () => ({ isMockDb: true }),
      deleteTopic: async (_db: Kysely<DbSchema>, id: number) => {
        if (id === 999) {
          throw new Error("Foreign key constraint violation or DB failure");
        }
        return;
      },
    },
  });

  const { deleteTopicTool } = await import("./deleteTopic.ts");

  await t.test("successfully deletes a topic", async () => {
    const mcpResponse = await deleteTopicTool.execute({ id: 123 });

    const result = JSON.parse(mcpResponse.content[0].text);

    assert.strictEqual(result.success, true);
    assert.match(result.message, /Topic with ID 123/);
  });

  await t.test("handles errors gracefully when deletion fails", async () => {
    const mcpResponse = await deleteTopicTool.execute({ id: 999 });

    const result = JSON.parse(mcpResponse.content[0].text);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /Foreign key constraint violation/);
  });
});
