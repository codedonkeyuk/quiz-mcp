# ts-mcp-tools

This is a starter template for a multi module MCP project, each mcp server module a MCP server in its own right.

Why not have separate MCP servers, orchestration mainly. Tools, prompts and documents can be easily grouped together because they look and behave the same no matter how they are packaged. Why orchestrate 5 packages when you can just have the one.

- **mcp-packages:** Shared modules used by various mcp-servers
- **mcp-servers:** Each is a MCP server in it own right. Through aggregation they add their own Tools, prompts and documents.

## Commands

| code               | description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| `npm install`      | install dependencies                                                       |
| `nvm use`          | use node version specified in projects .nvmrc file. (NVM needs installing) |
| `npm run test`     | run node:test library                                                      |
| `npm run clean`    | clean project using prettier                                               |
| `npm run validate` | validate code using typescript compiler. Does not generate files           |
| `npm run serve`    | serve MCP locally                                                          |

## Instructions

### Setting up Docker

This project has been designed to be deployed as docker compose container, and is accessible over a network bridge.

To create the bridge issues the following command on your target server.

```
docker network create mcp-tools-net
```

Update your main project / LLM client to use that bridge

```
services:
  LLMChatService:
  ...
  networks:
    - mcp_network
...
...
networks:
  mcp_network:
    external: true
    name: mcp-tools-net
```

No ports are exposed in the project as is. To see its alive and running use the following commands

```bash
docker exec -it ts-mcp-tools wget -qO- http://localhost:3000/ping
# should return {"status":"ok", "timestamp": "..."}

docker compose logs ts-mcp-tools
```

### Create a new MCP within project

Create a new package using the following as a package template

```json
{
  "name": "@mcp-servers/hello-world",
  "version": "0.0.1",
  // type & exports below must be delared that way avoid main. This is how a TS modules are picked up in node
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "node --experimental-strip-types --experimental-test-module-mocks --test \"**/*.test.ts\""
  },
  // If you are using any shared packages
  "dependencies": {
    "@mcp-packages/common": "*"
  }
}
```

Your index should use a delegate.

```ts
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
```

Then within `src/index.ts` ass the following

```ts
import registerHelloWorld from "@mcp-servers/hello-world"; // import server
//...

function createServer() {
  const server = new McpServer({
    name: "ts-mcp-tools-server",
    version: "0.0.1",
  });
  // ...
  registerHelloWorld(server); // apply server
  // ...
  return server;
}
```

### Setup database

[You can find instructions for that in it own README](./mcp-packages/database/README.md)
