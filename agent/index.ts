import { randomUUID } from "node:crypto";
import { createServer } from "./server";
import { listAdapters } from "./adapters";
import { parseConnectivityProfiles } from "./connectivity";
import { nextMonitorState, MonitorState } from "./monitor";
import { runPowerShell } from "./powershell";
import { readAgentConfig } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

type AgentEvent = {
  id: string;
  message: string;
  timestamp: string;
};

type RuntimeConfig = ReturnType<typeof readAgentConfig> & { adapter: string };

const MAX_EVENTS = 50;

function log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope: "agent",
    message,
    ...(metadata ? { metadata } : {})
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

function normalizeNumber(value: unknown, fallback: number, min: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < min) return fallback;
  return Math.floor(num);
}

function sanitizeTarget(target: string) {
  return target.replace(/'/g, "''");
}

function recordEvent(message: string) {
  const event = {
    id: randomUUID(),
    message,
    timestamp: new Date().toISOString()
  };
  events = [event, ...events].slice(0, MAX_EVENTS);
  return event;
}

const baseConfig = readAgentConfig();
const runtimeConfig: RuntimeConfig = {
  ...baseConfig,
  port: normalizeNumber(baseConfig.port, 8787, 1),
  retryCount: normalizeNumber(baseConfig.retryCount, 3, 1),
  retryIntervalMs: normalizeNumber(baseConfig.retryIntervalMs, 5000, 1000),
  adapter: ""
};

let events: AgentEvent[] = [];
let monitorState: MonitorState = {
  status: "offline",
  failureCount: 0,
  lastCheckedAt: new Date().toISOString()
};

let monitorTimer: NodeJS.Timeout | null = null;
let monitorRunning = false;
let resetInProgress = false;

async function readConnectivityProfile() {
  const command =
    "Get-NetConnectionProfile -ErrorAction Stop | Select-Object IPv4Connectivity, IPv6Connectivity | ConvertTo-Json";
  try {
    const output = await runPowerShell(command);
    return parseConnectivityProfiles(output);
  } catch (error) {
    log("warn", "Failed to read connection profile", {
      error: error instanceof Error ? error.message : String(error)
    });
    recordEvent("Failed to read connection profile");
    return false;
  }
}

async function pingTarget(target: string) {
  const safeTarget = sanitizeTarget(target);
  const command = `Test-Connection -ComputerName '${safeTarget}' -Count 1 -Quiet -ErrorAction SilentlyContinue`;
  try {
    const output = await runPowerShell(command);
    return String(output).trim().toLowerCase() === "true";
  } catch (error) {
    log("warn", "Ping check failed", {
      error: error instanceof Error ? error.message : String(error),
      target
    });
    recordEvent(`Ping check failed for ${target}`);
    return false;
  }
}

async function resolveAdapterName() {
  if (runtimeConfig.adapter) return runtimeConfig.adapter;
  try {
    const adapters = await listAdapters();
    const preferred = adapters.find((adapter) => adapter.status === "Up") ?? adapters[0];
    if (preferred?.name) {
      runtimeConfig.adapter = preferred.name;
      return preferred.name;
    }
  } catch (error) {
    log("warn", "Failed to resolve adapter", {
      error: error instanceof Error ? error.message : String(error)
    });
    recordEvent("Failed to resolve adapter");
  }
  return "";
}

async function resetAdapter() {
  if (resetInProgress) {
    return { ok: false };
  }

  resetInProgress = true;

  try {
    const adapterName = await resolveAdapterName();
    if (!adapterName) {
      log("warn", "Reset requested but no adapter selected");
      recordEvent("Reset requested but no adapter selected");
      return { ok: false };
    }

    recordEvent(`Resetting adapter ${adapterName}`);

    const safeName = sanitizeTarget(adapterName);
    const command = `Restart-NetAdapter -Name '${safeName}' -Confirm:$false -ErrorAction Stop`;
    await runPowerShell(command);

    recordEvent(`Adapter reset completed for ${adapterName}`);
    return { ok: true };
  } catch (error) {
    log("error", "Adapter reset failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    recordEvent("Adapter reset failed");
    return { ok: false };
  } finally {
    resetInProgress = false;
  }
}

function updateConfig(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return;
  }

  const record = body as Record<string, unknown>;
  let updated = false;

  if (typeof record.adapter === "string") {
    runtimeConfig.adapter = record.adapter;
    updated = true;
  }

  if (typeof record.pingTarget === "string" && record.pingTarget.trim()) {
    runtimeConfig.pingTarget = record.pingTarget.trim();
    updated = true;
  }

  const nextRetryCount = normalizeNumber(record.retryCount, runtimeConfig.retryCount, 1);
  if (nextRetryCount !== runtimeConfig.retryCount) {
    runtimeConfig.retryCount = nextRetryCount;
    updated = true;
  }

  const nextInterval = normalizeNumber(record.retryIntervalMs, runtimeConfig.retryIntervalMs, 1000);
  if (nextInterval !== runtimeConfig.retryIntervalMs) {
    runtimeConfig.retryIntervalMs = nextInterval;
    updated = true;
  }

  if (updated) {
    recordEvent("Configuration updated");
    log("info", "Configuration updated", {
      adapter: runtimeConfig.adapter,
      pingTarget: runtimeConfig.pingTarget,
      retryCount: runtimeConfig.retryCount,
      retryIntervalMs: runtimeConfig.retryIntervalMs
    });
    scheduleMonitor();
  }
}

async function runMonitorCycle() {
  if (monitorRunning) return;
  monitorRunning = true;

  try {
    const now = new Date().toISOString();
    const [profileOnline, pingOk] = await Promise.all([
      readConnectivityProfile(),
      pingTarget(runtimeConfig.pingTarget)
    ]);

    const decision = nextMonitorState(monitorState, { profileOnline, pingOk, now });
    monitorState = {
      status: decision.status,
      failureCount: decision.failureCount,
      lastCheckedAt: decision.lastCheckedAt
    };

    if (monitorState.status === "offline" && monitorState.failureCount === runtimeConfig.retryCount) {
      recordEvent(
        `Connectivity offline after ${monitorState.failureCount} checks. Triggering reset.`
      );
      await resetAdapter();
    }
  } catch (error) {
    log("error", "Monitor cycle failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    recordEvent("Monitor cycle failed");
  } finally {
    monitorRunning = false;
    scheduleMonitor();
  }
}

function scheduleMonitor() {
  if (monitorTimer) {
    clearTimeout(monitorTimer);
  }

  monitorTimer = setTimeout(() => {
    void runMonitorCycle();
  }, runtimeConfig.retryIntervalMs);
}

const server = createServer({
  token: runtimeConfig.token,
  getStatus: async () => monitorState,
  listAdapters: async () => listAdapters(),
  updateConfig: async (body: unknown) => updateConfig(body),
  resetAdapter: async () => resetAdapter(),
  getEvents: async () => events
});

server.listen(runtimeConfig.port, "127.0.0.1", () => {
  log("info", "Agent server started", { port: runtimeConfig.port });
  recordEvent("Agent server started");
  void runMonitorCycle();
});

process.on("SIGINT", () => {
  log("info", "Shutting down agent");
  if (monitorTimer) clearTimeout(monitorTimer);
  server.close(() => process.exit(0));
});
