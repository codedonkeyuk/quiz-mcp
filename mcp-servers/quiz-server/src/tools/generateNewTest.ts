import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { generateNewTest } from "../database/quizDb.ts";

const generateTestSchema = z.object({
  topic_name: z
    .string()
    .describe(
      "The general topic or subject matter of the quiz (e.g., 'TypeScript Basics')",
    ),
  questions: z
    .array(z.string())
    .describe(
      "A complete list of question strings generated from your knowledge base to ask the user",
    ),
});

export const generateNewTestTool = {
  name: "generate-new-test",
  description:
    "Generates a fresh test with a unique list of questions under a specific topic. Use this to construct a test for the user.",
  schema: generateTestSchema,

  execute: wrapExecution<z.infer<typeof generateTestSchema>>(
    "generate-new-test",
    async ({ topic_name, questions, ctx }: any) => {
      const db = ctx.db;

      const result = await generateNewTest(db, { topic_name, questions });

      return JSON.stringify({
        message:
          "Test created successfully. Please present these questions to the user.",
        test_id: result.test_id,
        topic_id: result.topic_id,
        questions: result.questions,
      });
    },
  ) as (args: any, ctx: any) => Promise<any>,
};
