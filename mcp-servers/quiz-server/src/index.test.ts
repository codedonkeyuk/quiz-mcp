import { test, before, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/server";

import * as originalDbModule from "./database/quizDb.ts";

mock.module("./database/quizDb.ts", {
  namedExports: {
    quizDb: async () => await originalDbModule.quizDb(":memory:"),

    createTopic: originalDbModule.createTopic,
    deleteTopic: originalDbModule.deleteTopic,
    generateNewTest: originalDbModule.generateNewTest,
    submitTestAnswers: originalDbModule.submitTestAnswers,
  },
});

describe("Quiz MCP Server Registry Integration", () => {
  let serverInstance: McpServer;
  let mockDbInstance: any;
  let createTopicTool: any;

  before(async () => {
    serverInstance = new McpServer({
      name: "test-server",
      version: "0.0.0",
    });

    const { default: registerQuiz } = await import("./index.ts");
    const { createTopicTool: importedTool } =
      await import("./tools/createTopic.ts");

    createTopicTool = importedTool;

    registerQuiz(serverInstance);

    mockDbInstance = await originalDbModule.quizDb(":memory:");
  });

  test("should successfully verify the tool can be invoked manually with a mock context object", async () => {
    const inputPayload = {
      name: "Unit Testing Basics",
      ctx: { db: mockDbInstance },
    };

    const rawResult: any = await createTopicTool.execute(inputPayload, {});

    const jsonString =
      typeof rawResult === "string"
        ? rawResult
        : rawResult?.content?.[0]?.text ||
          rawResult?.text ||
          JSON.stringify(rawResult);

    const result = JSON.parse(jsonString);

    assert.equal(result.success, true);
    assert.equal(result.name, "Unit Testing Basics");
    assert.ok(
      result.topic_id,
      "Should output a generated internal database identity primary key",
    );
  });
});
