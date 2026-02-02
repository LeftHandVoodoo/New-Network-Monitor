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

describe("cors", () => {
  it("handles preflight for localhost ui", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "X-IPC-Token, Content-Type"
      }
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-headers")).toContain("X-IPC-Token");
  });
});
