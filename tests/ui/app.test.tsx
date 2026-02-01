import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

const mocks = vi.hoisted(() => ({
  reset: vi.fn(),
  updateConfig: vi.fn()
}));

vi.mock("../../src/hooks/useAgentStatus", () => ({
  useAgentStatus: () => ({
    connectionState: "online",
    status: { status: "online", failureCount: 1, lastCheckedAt: "2026-02-01T00:00:00Z" },
    adapters: [{ name: "Wi-Fi", status: "Up", type: "Wireless80211" }],
    events: [{ id: "evt-1", message: "Ping ok", timestamp: "2026-02-01T00:00:00Z" }],
    error: null,
    lastUpdatedAt: "2026-02-01T00:00:00Z",
    updateConfig: mocks.updateConfig,
    reset: mocks.reset
  })
}));

describe("App", () => {
  beforeEach(() => {
    mocks.reset.mockClear();
    mocks.updateConfig.mockClear();
    mocks.reset.mockResolvedValue(undefined);
    mocks.updateConfig.mockResolvedValue(undefined);
  });

  it("renders agent status and controls", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /network monitor/i })).toBeInTheDocument();
    expect(screen.getByText(/agent connected/i)).toBeInTheDocument();
    expect(screen.getByText(/online/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/active adapter/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /wi-fi/i })).toBeInTheDocument();
    expect(screen.getByText(/ping ok/i)).toBeInTheDocument();
  });

  it("triggers manual reset", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /reset now/i }));

    await waitFor(() => expect(mocks.reset).toHaveBeenCalled());
  });
});
