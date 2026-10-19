import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import quizDb from "../database/quizDb.ts";
import createTest from "../database/createTest.ts";

const createTestSchema = z.object({
  topic_name: z
    .string()
    .describe(
      "The exact name of the topic or subject matter to create a test for (e.g., 'TypeScript Basics').",
    ),
  number_of_questions: z
    .number()
    .int()
    .positive()
    .describe("The total number of questions intended for this test instance."),
});

export const createTestTool = {
  name: "create-test",
  description:
    "Initializes a new test instance for a specific topic and returns the first random question.",
  schema: createTestSchema,

  execute: wrapExecution<z.infer<typeof createTestSchema>>(
    "create-test",
    async ({ topic_name, number_of_questions }: any) => {
      try {
        const db = await quizDb();

        const result = await createTest(db, topic_name, number_of_questions);

        return JSON.stringify({
          success: true,
          message: "Test initiated successfully. Here is your first question.",
          question: result.question,
          question_id: result.questionId,
          test_id: result.testId,
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message ||
            "An unexpected error occurred while initializing the test.",
        });
      }
    },
  ) as (args: any) => Promise<any>,
};
