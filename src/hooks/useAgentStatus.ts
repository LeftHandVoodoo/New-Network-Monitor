import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAgentClient } from "../api/agentClient";

const DEFAULT_POLL_INTERVAL_MS = 5000;

export type AgentStatusSnapshot = {
  status: string;
  failureCount: number;
  lastCheckedAt: string;
};

export type AgentAdapter = {
  name: string;
  status: string;
  type: string;
};

export type AgentEvent = {
  id: string;
  message: string;
  timestamp: string;
};

export type AgentConnectionState = "connecting" | "online" | "offline";

type AgentStatusOptions = {
  baseUrl?: string;
  token?: string;
  pollIntervalMs?: number;
};

function resolvePort(): number {
  const raw = Number(import.meta.env.VITE_AGENT_PORT ?? 8787);
  return Number.isFinite(raw) && raw > 0 ? raw : 8787;
}

export function useAgentStatus(options: AgentStatusOptions = {}) {
  const baseUrl = options.baseUrl ?? `http://127.0.0.1:${resolvePort()}`;
  const token = options.token ?? String(import.meta.env.VITE_IPC_TOKEN ?? "");
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const client = useMemo(() => createAgentClient({ baseUrl, token }), [baseUrl, token]);
  const [connectionState, setConnectionState] = useState<AgentConnectionState>(
    token ? "connecting" : "offline"
  );
  const [status, setStatus] = useState<AgentStatusSnapshot | null>(null);
  const [adapters, setAdapters] = useState<AgentAdapter[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [error, setError] = useState<string | null>(token ? null : "IPC token not set");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const pollingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (pollingRef.current) return;
    if (!token) {
      setConnectionState("offline");
      setError("IPC token not set");
      return;
    }

    pollingRef.current = true;

    try {
      await client.health();
      const [nextStatus, nextAdapters, nextEvents] = await Promise.all([
        client.status(),
        client.adapters(),
        client.events()
      ]);
      setStatus(nextStatus);
      setAdapters(nextAdapters);
      setEvents(nextEvents);
      setConnectionState("online");
      setError(null);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      setConnectionState("offline");
      setError(err instanceof Error ? err.message : "Agent request failed");
    } finally {
      pollingRef.current = false;
    }
  }, [client, token]);

  useEffect(() => {
    refresh();
    if (!token) return;
    const id = window.setInterval(refresh, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [pollIntervalMs, refresh, token]);

  const updateConfig = useCallback(
    async (body: unknown) => {
      await client.updateConfig(body);
      await refresh();
    },
    [client, refresh]
  );

  const reset = useCallback(async () => {
    await client.reset();
    await refresh();
  }, [client, refresh]);

  return {
    connectionState,
    status,
    adapters,
    events,
    error,
    lastUpdatedAt,
    updateConfig,
    reset
  };
}
