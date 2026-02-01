import { describe, it, expect, vi } from "vitest";
import { createAgentClient } from "../../src/api/agentClient";

describe("agent client", () => {
  it("adds ipc token header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const client = createAgentClient({ baseUrl: "http://127.0.0.1:8787", token: "abc", fetchImpl });

    await client.health();

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/health",
      expect.objectContaining({ headers: { "X-IPC-Token": "abc" } })
    );
  });
});
