// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../agent/server";

let baseUrl = "";
let server: ReturnType<typeof createServer> | null = null;

beforeAll(async () => {
  server = createServer({
    token: "test-token",
    getStatus: async () => ({ status: "online", failureCount: 0, lastCheckedAt: "" }),
    listAdapters: async () => [],
    updateConfig: async () => undefined,
    resetAdapter: async () => ({ ok: true }),
    getEvents: async () => []
  });

  await new Promise<void>((resolve) => {
    server!.listen(0, () => resolve());
  });

  const address = server!.address();
  if (typeof address === "object" && address) {
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

describe("server auth", () => {
  it("rejects requests without token", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(401);
  });

  it("accepts token and returns health", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { "X-IPC-Token": "test-token" }
    });
    expect(res.status).toBe(200);
  });
});
