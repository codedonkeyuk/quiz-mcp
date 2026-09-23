import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { quizDb, submitTestAnswers } from "../database/quizDb.ts"; // Adjust path

const submitAnswersSchema = z.object({
  test_id: z.number().describe("The unique ID of the test being completed"),
  answers: z
    .array(
      z.object({
        question_id: z
          .number()
          .describe("The specific database ID of the question"),
        user_answer: z
          .string()
          .describe("The plain text answer provided by the human user"),
        is_correct: z
          .boolean()
          .describe("Whether the answer was graded as correct or incorrect"),
      }),
    )
    .describe("The complete collection of responses from the user"),
});

export const submitTestAnswersTool = {
  name: "submit-test-answers",
  description:
    "Submits all of the human user's finalized answers for a specific test run directly into the database schema.",
  schema: submitAnswersSchema,

  execute: wrapExecution<z.infer<typeof submitAnswersSchema>>(
    "submit-test-answers",
    async ({ test_id, answers }: any) => {
      try {
        const db = await quizDb();

        await submitTestAnswers(db, { test_id, answers });

        return JSON.stringify({
          success: true,
          message: "All answers have been successfully tracked and recorded.",
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message ||
            "An unexpected error occurred while submitting test.",
        });
      }
    },
  ) as (args: any) => Promise<any>,
};
