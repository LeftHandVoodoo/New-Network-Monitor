import { env } from "node:process";

export function readAgentConfig() {
  const port = Number(env.PORT ?? 8787);
  const token = String(env.IPC_TOKEN ?? "");
  if (!token) throw new Error("IPC_TOKEN is required");
  return {
    port,
    token,
    pingTarget: String(env.PING_TARGET ?? "8.8.8.8"),
    retryCount: Number(env.RETRY_COUNT ?? 3),
    retryIntervalMs: Number(env.RETRY_INTERVAL_MS ?? 5000)
  };
}
