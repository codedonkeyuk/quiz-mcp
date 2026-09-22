import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { deleteTopic } from "../database/quizDb.ts"; // Adjust path

const deleteTopicSchema = z.object({
  id: z
    .number()
    .describe("The unique database integer ID of the topic you want to delete"),
});

export const deleteTopicTool = {
  name: "delete-topic",
  description:
    "Permanently deletes a quiz topic category by its ID. WARNING: This will cascade-delete all related tests, questions, and answers.",
  schema: deleteTopicSchema,

  execute: wrapExecution<z.infer<typeof deleteTopicSchema>>(
    "delete-topic",
    async ({ id, ctx }: any) => {
      const db = ctx.db;

      try {
        await deleteTopic(db, id);

        return JSON.stringify({
          success: true,
          message: `Topic with ID ${id} and all its cascading dependencies were successfully deleted.`,
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message ||
            "An unexpected error occurred while deleting the topic.",
        });
      }
    },
  ) as (args: any, ctx: any) => Promise<any>,
};
