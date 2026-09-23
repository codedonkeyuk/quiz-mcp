import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";
import { createTopic, quizDb } from "../database/quizDb.ts"; // Adjust path

const createTopicSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "The unique name of the topic to create (e.g., 'Docker Advanced', 'CSS Grid')",
    ),
});

export const createTopicTool = {
  name: "create-topic",
  description:
    "Creates a new quiz topic category in the database database bank. Names must be unique.",
  schema: createTopicSchema,

  execute: wrapExecution<z.infer<typeof createTopicSchema>>(
    "create-topic",
    async ({ name }: any) => {
      try {
        const db = await quizDb();
        const result = await createTopic(db, name);

        return JSON.stringify({
          success: true,
          message: `Topic "${name}" successfully created.`,
          topic_id: result.id,
          name: result.name,
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error:
            error.message ||
            "An unexpected error occurred while creating the topic.",
        });
      }
    },
  ) as (args: any) => Promise<any>,
};
