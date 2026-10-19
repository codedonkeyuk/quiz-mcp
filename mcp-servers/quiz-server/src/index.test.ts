import { test, mock } from "node:test";
import assert from "node:assert";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

test("registerQuiz registration pipeline", async (t) => {
  mock.module("./tools/createQuizTool.ts", {
    namedExports: {
      createQuizTool: {
        name: "create-test-knowledge",
        description: "mocked description",
        schema: z.object({ name: z.string() }),
        execute: async () => {},
      },
    },
  });

  mock.module("./tools/createTestTool.ts", {
    namedExports: {
      createTestTool: {
        name: "create-test",
        description: "mocked description",
        schema: z.object({ topic_name: z.string() }),
        execute: async () => {},
      },
    },
  });

  mock.module("./tools/submitAnswerTool.ts", {
    namedExports: {
      submitAnswerTool: {
        name: "submit-answer",
        description: "mocked description",
        schema: z.object({ test_id: z.number() }),
        execute: async () => {},
      },
    },
  });

  mock.module("./tools/saveTestGradeTool.ts", {
    namedExports: {
      saveTestGradeTool: {
        name: "save-test-grade",
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
      assert.ok(toolNames.includes("create-test-knowledge"));
      assert.ok(toolNames.includes("create-test"));
      assert.ok(toolNames.includes("submit-answer"));
      assert.ok(toolNames.includes("save-test-grade"));
    },
  );
});
