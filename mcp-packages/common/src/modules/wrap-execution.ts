export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function wrapExecution<T>(
  toolName: string,
  fn: (args: T) => Promise<unknown>,
): (args: T) => Promise<ToolResponse> {
  return async (args: T): Promise<ToolResponse> => {
    try {
      const data = await fn(args);

      return {
        content: [
          {
            type: "text",
            text: typeof data === "string" ? data : JSON.stringify(data),
          },
        ],
      };
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      process.stderr.write(
        `[MCP ERROR] [${toolName}] Execution failed: ${errorMessage}\n`,
      );

      return {
        content: [
          {
            type: "text",
            text: `Execution failed: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  };
}
