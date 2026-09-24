import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { generateNewTest, quizDb } from "../database/quizDb.ts";

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
    "Generates a fresh test in the database. CRITICAL: Do NOT say 'Question 1:'. Do NOT output any introductory text or greetings. Just output the question itself using the text provided in the next_question field.",
  schema: generateTestSchema,

  execute: wrapExecution<z.infer<typeof generateTestSchema>>(
    "generate-new-test",
    async ({ topic_name, questions }: any) => {
      try {
        const db = await quizDb();

        const result = await generateNewTest(db, { topic_name, questions });

        return JSON.stringify({
          message:
            "Test created successfully. I will now present the questions one by one.",
          test_id: result.test_id,
          topic_id: result.topic_id,
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message ||
            "An unexpected error occurred while generating test.",
        });
      }
    },
  ) as (args: any) => Promise<any>,
};
