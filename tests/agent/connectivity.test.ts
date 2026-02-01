// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseConnectivityProfiles } from "../../agent/connectivity";

describe("parseConnectivityProfiles", () => {
  it("returns false for null payloads", () => {
    expect(parseConnectivityProfiles("null")).toBe(false);
  });

  it("returns false for invalid JSON", () => {
    expect(parseConnectivityProfiles("not-json")).toBe(false);
  });

  it("handles single object payload", () => {
    const json = JSON.stringify({ IPv4Connectivity: "Internet" });
    expect(parseConnectivityProfiles(json)).toBe(true);
  });

  it("treats IPv6 LocalNetwork as online", () => {
    const json = JSON.stringify({ IPv6Connectivity: "LocalNetwork" });
    expect(parseConnectivityProfiles(json)).toBe(true);
  });

  it("skips non-object entries", () => {
    const json = JSON.stringify([null, "nope", 123, { IPv4Connectivity: "Internet" }]);
    expect(parseConnectivityProfiles(json)).toBe(true);
  });
});
