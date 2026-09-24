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
    "Submits the user's answer for a single question. It returns instructions on what question to print out next or flags if the test is completed.",
  schema: answerSchema,

  execute: wrapExecution<z.infer<typeof answerSchema>>(
    "submit-test-answer",
    async ({ test_id, question_id, user_answer, is_correct }: any) => {
      try {
        const db = await quizDb();

        // 1. Run the database transaction to pull down the next state object
        const result = await submitAnswer(db, {
          test_id,
          question_id,
          user_answer,
          is_correct,
        });

        if (result.test_complete || !result.next_question) {
          return {
            content: [
              {
                type: "text",
                text: `[SYSTEM COMMAND: TEST_COMPLETE] All questions have been completed and successfully written to the database. Present a concluding summary message to the user now.`,
              },
            ],
          };
        }

        const nextQ = result.next_question;

        return {
          content: [
            {
              type: "text",
              text: `[SYSTEM COMMAND: CONTINUE] Answer recorded. You must immediately state this question to the user next: "${nextQ.text}" (Question Database ID: ${nextQ.id}). Do not give any hints or commentary on their previous answer.`,
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
          isError: true,
        };
      }
    },
  ) as (args: any) => Promise<any>,
};
