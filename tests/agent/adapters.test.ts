// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { listAdapters, parseAdapters } from "../../agent/adapters";
import { runPowerShell } from "../../agent/powershell";

vi.mock("../../agent/powershell", () => ({
  runPowerShell: vi.fn()
}));

describe("parseAdapters", () => {
  it("normalizes adapter list", () => {
    const json = JSON.stringify([
      { Name: "Wi-Fi", Status: "Up", InterfaceType: "Wireless80211" },
      { Name: "Ethernet", Status: "Down", InterfaceType: "Ethernet" }
    ]);

    const result = parseAdapters(json);
    expect(result).toEqual([
      { name: "Wi-Fi", status: "Up", type: "Wireless80211" },
      { name: "Ethernet", status: "Down", type: "Ethernet" }
    ]);
  });

  it("handles single object payload", () => {
    const json = JSON.stringify({ Name: "Wi-Fi", Status: "Up", InterfaceType: "Wireless80211" });
    const result = parseAdapters(json);
    expect(result).toEqual([{ name: "Wi-Fi", status: "Up", type: "Wireless80211" }]);
  });

  it("returns empty for null payloads", () => {
    const result = parseAdapters("null");
    expect(result).toEqual([]);
  });

  it("returns empty for invalid JSON", () => {
    const result = parseAdapters("not-json");
    expect(result).toEqual([]);
  });

  it("skips non-object entries", () => {
    const json = JSON.stringify([
      null,
      "nope",
      123,
      { Name: "Wi-Fi", Status: "Up", InterfaceType: "Wireless80211" }
    ]);

    const result = parseAdapters(json);
    expect(result).toEqual([{ name: "Wi-Fi", status: "Up", type: "Wireless80211" }]);
  });
});

describe("listAdapters", () => {
  it("propagates errors from runPowerShell", async () => {
    const error = new Error("boom");
    vi.mocked(runPowerShell).mockRejectedValueOnce(error);

    await expect(listAdapters()).rejects.toThrow("boom");
  });
});
