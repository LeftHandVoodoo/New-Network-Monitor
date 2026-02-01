// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseAdapters } from "../../agent/adapters";

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
});
