import { McpServer } from "@modelcontextprotocol/server";
import { helloWorldTool } from "./tools/hello-world-tool.ts";

export default function registerHelloWorld(server: McpServer) {
  server.registerTool(
    helloWorldTool.name,
    {
      description: helloWorldTool.description,
      inputSchema: helloWorldTool.schema,
    },
    helloWorldTool.execute,
  );

  return server;
}
