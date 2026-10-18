import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { saveTestGrade, quizDb } from "../database/quizDb.ts";

const saveTestGradeSchema = z.object({
  test_id: z
    .number()
    .int()
    .positive()
    .describe("The unique ID tracking the completed test session."),
  final_grade: z
    .number()
    .min(0)
    .max(100)
    .describe("The final calculated score/percentage for the entire test."),
  answers_feedback: z
    .array(
      z.object({
        answerId: z
          .number()
          .int()
          .positive()
          .describe("The unique database ID of the user's recorded answer."),
        correct: z
          .boolean()
          .describe(
            "Flag marking whether this individual answer was correct or incorrect.",
          ),
      }),
    )
    .describe("An evaluation array grading individual question answers."),
});

export const saveTestGradeTool = {
  name: "save-test-grade",
  description:
    "Saves the final graded score and individual question answer feedback metrics back into the database.",
  schema: saveTestGradeSchema,

  execute: wrapExecution<z.infer<typeof saveTestGradeSchema>>(
    "save-test-grade",
    async ({ test_id, final_grade, answers_feedback }: any) => {
      try {
        const db = await quizDb();

        await saveTestGrade(db, test_id, final_grade, answers_feedback);

        return JSON.stringify({
          success: true,
          message: "Test grade and feedback stored successfully.",
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message ||
            "An unexpected error occurred while saving the test grade metrics.",
        });
      }
    },
  ) as (args: any) => Promise<any>,
};
