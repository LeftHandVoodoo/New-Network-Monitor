// @vitest-environment node
import { describe, it, expect } from "vitest";
import { nextMonitorState } from "../../agent/monitor";

const base = {
  status: "offline",
  failureCount: 0,
  lastCheckedAt: "2026-02-01T00:00:00Z"
};

describe("monitor", () => {
  it("triggers reset after 3 failed pings", () => {
    let state = base;
    const now = "2026-02-01T00:00:05Z";
    state = nextMonitorState(state, { profileOnline: false, pingOk: false, now });
    state = nextMonitorState(state, { profileOnline: false, pingOk: false, now });
    const final = nextMonitorState(state, { profileOnline: false, pingOk: false, now });

    expect(final.failureCount).toBe(3);
    expect(final.shouldReset).toBe(true);
  });

  it("clears failure count on successful ping", () => {
    const state = nextMonitorState(
      { ...base, failureCount: 2 },
      { profileOnline: true, pingOk: true, now: "2026-02-01T00:00:05Z" }
    );

    expect(state.failureCount).toBe(0);
    expect(state.shouldReset).toBe(false);
    expect(state.status).toBe("online");
  });

  it("does not repeat reset after reaching the threshold", () => {
    let state = base;
    const now = "2026-02-01T00:00:05Z";
    state = nextMonitorState(state, { profileOnline: false, pingOk: false, now });
    state = nextMonitorState(state, { profileOnline: false, pingOk: false, now });
    const threshold = nextMonitorState(state, { profileOnline: false, pingOk: false, now });
    const after = nextMonitorState(threshold, { profileOnline: false, pingOk: false, now });

    expect(threshold.failureCount).toBe(3);
    expect(threshold.shouldReset).toBe(true);
    expect(after.failureCount).toBe(4);
    expect(after.shouldReset).toBe(false);
  });
});
