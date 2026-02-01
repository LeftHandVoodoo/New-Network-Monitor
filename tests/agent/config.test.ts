// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readAgentConfig } from "../../agent/config";

process.env.PORT = "8787";
process.env.IPC_TOKEN = "token";

describe("agent config", () => {
  it("reads required env vars", () => {
    const config = readAgentConfig();
    expect(config.port).toBe(8787);
    expect(config.token).toBe("token");
  });
});
