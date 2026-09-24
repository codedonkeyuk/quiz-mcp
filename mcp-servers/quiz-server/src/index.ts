import { McpServer } from "@modelcontextprotocol/server";
import { generateNewTestTool } from "./tools/generateNewTest.ts";
import { submitTestAnswerTool } from "./tools/submitTestAnswerTool.ts";
import { createTopicTool } from "./tools/createTopic.ts";
import { deleteTopicTool } from "./tools/deleteTopic.ts";

export default function registerQuiz(server: McpServer) {
  server.registerTool(
    createTopicTool.name,
    {
      description: createTopicTool.description,
      inputSchema: createTopicTool.schema,
    },
    async (args) => {
      return await createTopicTool.execute(args);
    },
  );

  server.registerTool(
    deleteTopicTool.name,
    {
      description: deleteTopicTool.description,
      inputSchema: deleteTopicTool.schema,
    },
    async (args) => {
      return await deleteTopicTool.execute(args);
    },
  );

  server.registerTool(
    generateNewTestTool.name,
    {
      description: generateNewTestTool.description,
      inputSchema: generateNewTestTool.schema,
    },
    async (args) => {
      return await generateNewTestTool.execute(args);
    },
  );

  server.registerTool(
    submitTestAnswerTool.name,
    {
      description: submitTestAnswerTool.description,
      inputSchema: submitTestAnswerTool.schema,
    },
    async (args) => {
      return await submitTestAnswerTool.execute(args);
    },
  );

  return server;
}
