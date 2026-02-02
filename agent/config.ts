import { env } from "node:process";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export function readAgentConfig() {
  const port = Number(env.PORT ?? 8787);
  const token = String(env.IPC_TOKEN ?? "");
  if (!token) throw new Error("IPC_TOKEN is required");
  return {
    port,
    token,
    pingTarget: String(env.PING_TARGET ?? "8.8.8.8"),
    retryCount: Number(env.RETRY_COUNT ?? 3),
    retryIntervalMs: Number(env.RETRY_INTERVAL_MS ?? 5000),
    autoResetEnabled: parseBoolean(env.AUTO_RESET_ENABLED, true)
  };
}
