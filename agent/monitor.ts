export type MonitorState = {
  status: "online" | "offline";
  failureCount: number;
  lastCheckedAt: string;
};

export type MonitorInput = {
  profileOnline: boolean;
  pingOk: boolean;
  now: string;
};

export type MonitorDecision = MonitorState & { shouldReset: boolean };

export function nextMonitorState(state: MonitorState, input: MonitorInput): MonitorDecision {
  const online = input.profileOnline && input.pingOk;
  const failureCount = online ? 0 : state.failureCount + 1;

  return {
    status: online ? "online" : "offline",
    failureCount,
    lastCheckedAt: input.now,
    shouldReset: !online && failureCount === 3
  };
}
