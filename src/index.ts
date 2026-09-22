import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import registerHelloWorld from "@mcp-servers/hello-world";

import express, { type Request, type Response } from "express";

function createServer() {
  const server = new McpServer({
    name: "ts-mcp-tools-server",
    version: "0.0.1",
  });

  registerHelloWorld(server);

  return server;
}

const app = express();
app.use(express.json());

app.get("/ping", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const mcpHandler = createMcpHandler(createServer);
const nodeHandler = toNodeHandler(mcpHandler);

app.all("/mcp", (req: Request, res: Response) => {
  void nodeHandler(req, res, req.body);
});

const PORT = 3000;
export const appServer = app.listen(PORT, () => {
  console.error(`MCP Stateless Server running on port ${PORT}`);
});
