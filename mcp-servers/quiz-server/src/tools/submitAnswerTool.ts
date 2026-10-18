import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { submitAnswer, quizDb } from "../database/quizDb.ts";

const submitAnswerSchema = z.object({
  test_id: z
    .number()
    .int()
    .positive()
    .describe("The unique ID tracking the active test session."),
  question_id: z
    .number()
    .int()
    .positive()
    .describe("The unique ID of the question being answered."),
  answer: z.string().describe("The user's response text to the question."),
});

export const submitAnswerTool = {
  name: "submit-answer",
  description:
    "Submits the user's answer to a specific question. Returns either the next question or the final test evaluation payload if completed. CRITICAL RULE: If status is 'next_question', do NOT output any introductory text, confirmation messages, or greetings. Just output the raw question text found in the next_question payload immediately.",
  schema: submitAnswerSchema,

  execute: wrapExecution<z.infer<typeof submitAnswerSchema>>(
    "submit-answer",
    async ({ test_id, question_id, answer }: any) => {
      try {
        const db = await quizDb();

        const result = await submitAnswer(db, {
          testId: test_id,
          questionId: question_id,
          answer: answer,
        });

        if (result.status === "completed") {
          return JSON.stringify({
            success: true,
            status: "completed",
            message: "Test completed. Here is the evaluation data for grading.",
            evaluation_payload: result.evaluationPayload,
          });
        }

        return JSON.stringify({
          success: true,
          status: "next_question",
          next_question: {
            id: result.nextQuestion.id,
            question: result.nextQuestion.question,
          },
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message ||
            "An unexpected error occurred while submitting your answer.",
        });
      }
    },
  ) as (args: any) => Promise<any>,
};
