import { test, mock } from "node:test";
import { strict as assert } from "node:assert";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";

mock.module("@mcp-servers/hello-world", {
  exports: {
    default: mock.fn((server: McpServer) => {
      server.registerTool(
        "mocked-tool-one",
        {
          description: "Says hello",
          inputSchema: z.object({ name: z.string().optional() }),
        },
        async () =>
          ({ content: [{ type: "text", text: "mocked hello" }] }) as any,
      );

      server.registerTool(
        "mocked-tool-two",
        {
          description: "Gives weather",
          inputSchema: z.object({ city: z.string() }),
        },
        async () =>
          ({ content: [{ type: "text", text: "mocked weather" }] }) as any,
      );
    }),
  },
});

/* ==========================================================================
   Test Specifications
   ========================================================================= */

test("registers tools correctly via context execution tracking", async () => {
  const server = new McpServer({
    name: "test-server",
    version: "2.0.0",
  });

  const registerToolSpy = mock.method(
    server,
    "registerTool",
    server.registerTool.bind(server),
  );

  const mainModule = (await import("./index.ts")) as {
    default?: any;
    appServer?: { close: (cb?: () => void) => void };
  };

  const { default: registerHelloWorld } =
    (await import("@mcp-servers/hello-world")) as any;
  registerHelloWorld(server);

  assert.equal(registerToolSpy.mock.calls.length, 2);

  const toolOneCall = registerToolSpy.mock.calls.find(
    (c: any) => c.arguments[0] === "mocked-tool-one",
  );
  assert.ok(toolOneCall, "mocked-tool-one should be registered");

  const [nameOne, optionsOne, handlerOne] = toolOneCall.arguments as any[];

  assert.equal(nameOne, "mocked-tool-one");
  assert.equal(optionsOne.description, "Says hello");
  assert.equal(typeof handlerOne, "function");

  const resultOne = await handlerOne({ name: "Ada" });
  assert.deepEqual(resultOne, {
    content: [{ type: "text", text: "mocked hello" }],
  });

  const toolTwoCall = registerToolSpy.mock.calls.find(
    (c: any) => c.arguments[0] === "mocked-tool-two",
  );
  assert.ok(toolTwoCall, "mocked-tool-two should be registered");

  const [nameTwo, optionsTwo, handlerTwo] = toolTwoCall.arguments as any[];

  assert.equal(nameTwo, "mocked-tool-two");
  assert.equal(optionsTwo.description, "Gives weather");
  assert.equal(typeof handlerTwo, "function");

  const resultTwo = await handlerTwo({ city: "London" });
  assert.deepEqual(resultTwo, {
    content: [{ type: "text", text: "mocked weather" }],
  });

  if (
    mainModule.appServer &&
    typeof mainModule.appServer.close === "function"
  ) {
    mainModule.appServer.close();
  }
});
