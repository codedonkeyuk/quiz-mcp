import { McpServer } from "@modelcontextprotocol/server";
import { generateNewTestTool } from "./tools/generateNewTest.ts";
import { submitTestAnswersTool } from "./tools/submitTestAnswers.ts";
import { createTopicTool } from "./tools/createTopic.ts";
import { deleteTopicTool } from "./tools/deleteTopic.ts";
import { quizDb } from "./database/quizDb.ts";

let dbInstanceInstance: any = null;
async function getDatabaseConnection() {
  if (!dbInstanceInstance) {
    dbInstanceInstance = await quizDb();
  }
  return dbInstanceInstance;
}

export default function registerQuiz(server: McpServer) {
  server.registerTool(
    createTopicTool.name,
    {
      description: createTopicTool.description,
      inputSchema: createTopicTool.schema,
    },
    async (args, extra) => {
      const dbInstance = await getDatabaseConnection();
      const ctx = { ...extra, db: dbInstance };
      return await createTopicTool.execute(args, ctx);
    },
  );

  server.registerTool(
    deleteTopicTool.name,
    {
      description: deleteTopicTool.description,
      inputSchema: deleteTopicTool.schema,
    },
    async (args, extra) => {
      const dbInstance = await getDatabaseConnection();
      const ctx = { ...extra, db: dbInstance };
      return await deleteTopicTool.execute(args, ctx);
    },
  );

  server.registerTool(
    generateNewTestTool.name,
    {
      description: generateNewTestTool.description,
      inputSchema: generateNewTestTool.schema,
    },
    async (args, extra) => {
      const dbInstance = await getDatabaseConnection();
      const ctx = { ...extra, db: dbInstance };
      return await generateNewTestTool.execute(args, ctx);
    },
  );

  server.registerTool(
    submitTestAnswersTool.name,
    {
      description: submitTestAnswersTool.description,
      inputSchema: submitTestAnswersTool.schema,
    },
    async (args, extra) => {
      const dbInstance = await getDatabaseConnection();
      const ctx = { ...extra, db: dbInstance };
      return await submitTestAnswersTool.execute(args, ctx);
    },
  );

  return server;
}
