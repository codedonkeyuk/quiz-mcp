import { McpServer } from "@modelcontextprotocol/server";
import { createTestKnowledgeTool } from "./tools/createTestKnowledgeTool.ts";
import { createTestTool } from "./tools/createTestTool.ts";
import { submitAnswerTool } from "./tools/submitAnswerTool.ts";
import { saveTestGradeTool } from "./tools/saveTestGradeTool.ts";

export default function registerQuiz(server: McpServer) {
  server.registerTool(
    createTestKnowledgeTool.name,
    {
      description: createTestKnowledgeTool.description,
      inputSchema: createTestKnowledgeTool.schema,
    },
    async (args) => {
      return await createTestKnowledgeTool.execute(args);
    },
  );

  server.registerTool(
    createTestTool.name,
    {
      description: createTestTool.description,
      inputSchema: createTestTool.schema,
    },
    async (args) => {
      return await createTestTool.execute(args);
    },
  );

  server.registerTool(
    submitAnswerTool.name,
    {
      description: submitAnswerTool.description,
      inputSchema: submitAnswerTool.schema,
    },
    async (args) => {
      return await submitAnswerTool.execute(args);
    },
  );

  server.registerTool(
    saveTestGradeTool.name,
    {
      description: saveTestGradeTool.description,
      inputSchema: saveTestGradeTool.schema,
    },
    async (args) => {
      return await saveTestGradeTool.execute(args);
    },
  );

  return server;
}
