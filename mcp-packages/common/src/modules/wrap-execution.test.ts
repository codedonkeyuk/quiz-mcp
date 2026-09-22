import assert from "node:assert";
import { test, mock } from "node:test";
import { wrapExecution } from "./wrap-execution.ts";

test("wrapExecution - success paths", async (t) => {
  await t.test(
    "returns a formatted text block when target function returns a string",
    async () => {
      const mockFn = async (args: { name: string }) => `Hello, ${args.name}!`;
      const wrapped = wrapExecution("test-tool", mockFn);

      const result = await wrapped({ name: "Ada" });

      assert.deepEqual(result, {
        content: [{ type: "text", text: "Hello, Ada!" }],
      });
    },
  );

  await t.test(
    "automatically stringifies objects returned by the target function",
    async () => {
      const mockFn = async () => ({ status: "active", code: 200 });
      const wrapped = wrapExecution("test-tool", mockFn);

      const result = await wrapped({});

      assert.deepEqual(result, {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "active", code: 200 }),
          },
        ],
      });
    },
  );
});

test("wrapExecution - failure paths", async (t) => {
  const stderrSpy = mock.method(process.stderr, "write", () => true);

  t.after(() => {
    stderrSpy.mock.restore();
  });

  await t.test(
    "catches errors, formats output payload, and writes to stderr",
    async () => {
      stderrSpy.mock.resetCalls();

      const mockFn = async () => {
        throw new Error("Database timeout connection");
      };

      const wrapped = wrapExecution("error-tool", mockFn);
      const result = await wrapped({});

      assert.deepEqual(result, {
        content: [
          {
            type: "text",
            text: "Execution failed: Database timeout connection",
          },
        ],
        isError: true,
      });

      assert.equal(stderrSpy.mock.calls.length, 1);

      const [loggedString] = stderrSpy.mock.calls[0].arguments as unknown as [
        string,
      ];
      assert.match(
        loggedString,
        /\[MCP ERROR\] \[error-tool\] Execution failed: Database timeout connection/,
      );
    },
  );

  await t.test("handles non-Error objects thrown gracefully", async () => {
    stderrSpy.mock.resetCalls();

    const mockFn = async () => {
      throw "Uncaught primitive string exception";
    };

    const wrapped = wrapExecution("primitive-error-tool", mockFn);
    const result = await wrapped({});

    assert.deepEqual(result, {
      content: [
        {
          type: "text",
          text: "Execution failed: Uncaught primitive string exception",
        },
      ],
      isError: true,
    });
  });
});
