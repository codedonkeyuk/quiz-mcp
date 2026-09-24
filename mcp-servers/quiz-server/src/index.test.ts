import { test, mock } from "node:test";
import assert from "node:assert";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

test("registerQuiz registration pipeline", async (t) => {
  mock.module("./tools/createTopic.ts", {
    namedExports: {
      createTopicTool: {
        name: "create-topic",
        description: "mocked description",
        schema: z.object({ name: z.string() }),
        execute: async () => {},
      },
    },
  });

  mock.module("./tools/deleteTopic.ts", {
    namedExports: {
      deleteTopicTool: {
        name: "delete-topic",
        description: "mocked description",
        schema: z.object({ id: z.number() }),
        execute: async () => {},
      },
    },
  });

  mock.module("./tools/generateNewTest.ts", {
    namedExports: {
      generateNewTestTool: {
        name: "generate-new-test",
        description: "mocked description",
        schema: z.object({ topic_name: z.string() }),
        execute: async () => {},
      },
    },
  });

  // --- Updated path and variable name to match your new tool file ---
  mock.module("./tools/submitTestAnswerTool.ts", {
    namedExports: {
      submitTestAnswerTool: {
        name: "submit-test-answer",
        description: "mocked description",
        schema: z.object({ test_id: z.number() }),
        execute: async () => {},
      },
    },
  });

  const { default: registerQuiz } = await import("./index.ts");

  await t.test(
    "registers all 4 core quiz tools into the server configuration",
    async () => {
      const registeredTools: Array<{
        name: string;
        description: string;
        schema: any;
      }> = [];

      const mockServer = {
        registerTool: (name: string, config: any, _executeFn: Function) => {
          registeredTools.push({
            name,
            description: config.description,
            schema: config.inputSchema,
          });
          return {};
        },
      } as unknown as McpServer;

      registerQuiz(mockServer);

      assert.strictEqual(registeredTools.length, 4);

      const toolNames = registeredTools.map((t) => t.name);
      assert.ok(toolNames.includes("create-topic"));
      assert.ok(toolNames.includes("delete-topic"));
      assert.ok(toolNames.includes("generate-new-test"));
      assert.ok(toolNames.includes("submit-test-answer")); // <-- Updated name assertion
    },
  );
});
