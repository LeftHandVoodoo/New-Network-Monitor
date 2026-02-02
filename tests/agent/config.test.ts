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

  it("respects auto reset flag", () => {
    const previous = process.env.AUTO_RESET_ENABLED;
    process.env.AUTO_RESET_ENABLED = "false";

    const config = readAgentConfig();
    expect(config.autoResetEnabled).toBe(false);

    if (previous === undefined) {
      delete process.env.AUTO_RESET_ENABLED;
    } else {
      process.env.AUTO_RESET_ENABLED = previous;
    }
  });
});
