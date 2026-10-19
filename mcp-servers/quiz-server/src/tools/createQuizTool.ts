import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import quizDb from "../database/quizDb.ts";
import createQuiz from "../database/createQuiz.ts";

const createQuizSchema = z.object({
  name: z
    .string()
    .describe(
      "The name of the topic or subject matter to store in the quiz (e.g., 'TypeScript').",
    ),
  questions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The literal question text to ask the user."),
        correct_answer: z
          .string()
          .describe("The correct answer for this question."),
      }),
    )
    .describe(
      "A complete list of questions and their respective correct answers belonging to this topic.",
    ),
});

export const createQuizTool = {
  name: "create-test-knowledge",
  description:
    "Inserts a new topic and its associated question-and-answer pairs into the knowledge base database.",
  schema: createQuizSchema,

  execute: wrapExecution<z.infer<typeof createQuizSchema>>(
    "create-test-knowledge",
    async ({ name, questions }: any) => {
      try {
        const db = await quizDb();

        await createQuiz(db, { name, questions });

        return JSON.stringify({
          success: true,
          message: "Topic and questions added to the quiz successfully.",
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message || "An unexpected error occurred while saving quiz.",
        });
      }
    },
  ) as (args: any) => Promise<any>,
};
