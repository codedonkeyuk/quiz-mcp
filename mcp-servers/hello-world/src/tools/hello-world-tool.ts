import { z } from "zod";
import { wrapExecution } from "@mcp-packages/common";

const helloWorldSchema = z.object({
  name: z.string().optional().describe("An optional name to greet"),
});

export const helloWorldTool = {
  name: "hello-world",
  description: "A simple hello world tester tool",
  schema: helloWorldSchema,

  execute: wrapExecution<z.infer<typeof helloWorldSchema>>(
    "hello-world",
    async ({ name }: z.infer<typeof helloWorldSchema>) => {
      return `Hello, ${name || "World"}!`;
    },
  ) as (args: any, ctx: any) => Promise<any>,
};
