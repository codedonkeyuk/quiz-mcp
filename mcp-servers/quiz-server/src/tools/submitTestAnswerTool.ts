import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { quizDb, submitAnswer } from "../database/quizDb.ts";

const answerSchema = z.object({
  test_id: z.number(),
  question_id: z.number(),
  user_answer: z.string(),
  is_correct: z.boolean(),
});

export const submitTestAnswerTool = {
  name: "submit-test-answer",
  description:
    "Submits the user's answer for a single question. Instantly returns the next question text, or presents the final scorecard if the quiz is completed.",
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

        // If the test has ended, immediately render the calculation block results
        if (result.test_complete || !result.next_question) {
          const score = result.score || { correct: 0, total: 0, percentage: 0 };

          return {
            content: [
              {
                type: "text",
                text: `You have completed the quiz!\n\nFinal Scorecard:\n- Correct Answers: ${score.correct} / ${score.total}\n- Score: ${score.percentage}%\n\nProvide a brief summary review of their performance now.`,
              },
            ],
          };
        }

        // Otherwise continue the loop silently
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
              text: `Error processing answer submission: ${error.message || "Unknown error"}`,
            },
          ],
        };
      }
    },
  ) as (args: any) => Promise<any>,
};
