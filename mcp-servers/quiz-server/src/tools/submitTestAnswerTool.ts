import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { quizDb, submitAnswer } from "../database/quizDb.ts";

const answerSchema = z.object({
  test_id: z
    .number()
    .describe("The unique database ID of the active test being taken"),
  question_id: z
    .number()
    .describe(
      "The specific database ID of the current single question being answered",
    ),
  user_answer: z
    .string()
    .describe("The direct, raw plain text response provided by the human user"),
  is_correct: z
    .boolean()
    .describe(
      "Whether the user's answer was graded as correct or incorrect against your internal key",
    ),
});

export const submitTestAnswerTool = {
  name: "submit-test-answer",
  description:
    "Submits the user's answer for a single question. Instantly returns the next question text directly or marks completion status without commentary.",
  schema: answerSchema,

  execute: wrapExecution<z.infer<typeof answerSchema>>(
    "submit-test-answer",
    async ({ test_id, question_id, user_answer, is_correct }: any) => {
      try {
        const db = await quizDb();

        const result = await submitAnswer(db, {
          test_id,
          question_id,
          user_answer,
          is_correct,
        });

        // If test is complete, return standard payload markers to break loop natively
        if (result.test_complete || !result.next_question) {
          return {
            content: [
              {
                type: "text",
                text: "Test complete. Summarise the results and calculate the final score for the user now.",
              },
            ],
          };
        }

        // Return clean plaintext question string without custom system command brackets
        return {
          content: [
            {
              type: "text",
              text: result.next_question.text,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error processing answer submission: ${error.message || "Unknown execution error"}`,
            },
          ],
        };
      }
    },
  ) as (args: any) => Promise<any>,
};
