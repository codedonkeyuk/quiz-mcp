import assert from "node:assert";
import { test } from "node:test";
import { helloWorldTool } from "./tools/hello-world-tool.ts";

test("helloWorldTool.schema validates correct input", () => {
  const validData = { name: "World" };

  const result = helloWorldTool.schema.parse(validData);

  assert.strictEqual(result.name, "World");
});

test("helloWorldTool.execute returns correctly formatted response", async () => {
  const args = { name: "Developer" };
  // Mock the server context argument to satisfy your signature cast
  const mockCtx = {} as any;

  const result = await helloWorldTool.execute(args, mockCtx);

  assert.ok(Array.isArray(result.content), "Result content should be an array");
  assert.strictEqual(result.content.length, 1);
  assert.strictEqual(result.content[0].type, "text");
  assert.strictEqual(result.content[0].text, "Hello, Developer!");
});

test("helloWorldTool.execute handles unusual but valid string inputs", async () => {
  const args = { name: "123_Special_Chars!" };
  const mockCtx = {} as any;

  const result = await helloWorldTool.execute(args, mockCtx);

  // FIX: Changed expected output string to have exactly one exclamation mark "!"
  assert.strictEqual(result.content[0].text, "Hello, 123_Special_Chars!!");
});
