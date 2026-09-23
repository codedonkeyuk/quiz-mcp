import { test, mock } from "node:test";
import assert from "node:assert";
import { Kysely } from "kysely";
import { type DbSchema } from "../database/types.ts";

test("createTopicTool.execute", async (t) => {
  // 1. Mock the module definitions BEFORE dynamically importing the tool
  mock.module("../database/quizDb.ts", {
    namedExports: {
      quizDb: async () => ({ isMockDb: true }),
      createTopic: async (_db: Kysely<DbSchema>, name: string) => {
        if (name === "Trigger Error") {
          throw new Error("Database connection failed");
        }
        return { id: "topic-123", name };
      },
    },
  });

  // 2. Dynamically import the tool so it consumes the mocked database module
  const { createTopicTool } = await import("./createTopic.ts");

  // Helper to safely extract the stringified JSON from wrapExecution's response object
  const parseMcpResponse = (mcpResponse: any) => {
    try {
      if (mcpResponse?.content && Array.isArray(mcpResponse.content)) {
        return JSON.parse(mcpResponse.content[0].text);
      }
      if (mcpResponse?.content?.text) {
        return JSON.parse(mcpResponse.content.text);
      }
      return JSON.parse(mcpResponse);
    } catch (err) {
      console.error(
        "Failed to parse wrapExecution response. Complete object structure:",
        JSON.stringify(mcpResponse, null, 2),
      );
      throw err;
    }
  };

  await t.test("successfully creates a topic", async () => {
    const mcpResponse = await createTopicTool.execute({
      name: "Docker Advanced",
    });
    const result = parseMcpResponse(mcpResponse);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.topic_id, "topic-123");
    assert.strictEqual(result.name, "Docker Advanced");
  });

  await t.test("handles errors gracefully when database fails", async () => {
    const mcpResponse = await createTopicTool.execute({
      name: "Trigger Error",
    });
    const result = parseMcpResponse(mcpResponse);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /Database connection failed/);
  });
});
