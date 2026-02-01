import { useEffect, useState } from "react";
import { useAgentStatus } from "./hooks/useAgentStatus";

const defaultConfig = {
  pingTarget: "8.8.8.8",
  retryCount: 3,
  retryIntervalMs: 5000
};

const connectionCopy = {
  online: "Agent connected",
  offline: "Agent offline",
  connecting: "Connecting to agent"
} as const;

function formatStatus(value?: string) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function App() {
  const {
    connectionState,
    status,
    adapters,
    events,
    error,
    lastUpdatedAt,
    updateConfig,
    reset
  } = useAgentStatus();
  const [selectedAdapter, setSelectedAdapter] = useState("");
  const [pingTarget, setPingTarget] = useState(defaultConfig.pingTarget);
  const [retryCount, setRetryCount] = useState(defaultConfig.retryCount);
  const [retryIntervalMs, setRetryIntervalMs] = useState(defaultConfig.retryIntervalMs);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAdapter && adapters.length > 0) {
      setSelectedAdapter(adapters[0].name);
    }
  }, [adapters, selectedAdapter]);

  const handleApplyConfig = async () => {
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      await updateConfig({
        adapter: selectedAdapter,
        pingTarget,
        retryCount,
        retryIntervalMs
      });
      setConfigMessage("Configuration sent to agent.");
    } catch (err) {
      setConfigMessage(err instanceof Error ? err.message : "Failed to update configuration.");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setResetMessage(null);
    try {
      await reset();
      setResetMessage("Reset request sent.");
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  };

  const connectionLabel = connectionCopy[connectionState];
  const isAgentOnline = connectionState === "online";
  const lastCheckedAt = status?.lastCheckedAt ?? "Waiting for agent";

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local agent console</p>
          <h1>Network Monitor</h1>
          <p className="subtitle">Connectivity watcher with adapter reset on disconnect.</p>
        </div>
        <div className={`agent-pill ${connectionState}`}>
          <span className="agent-dot" />
          {connectionLabel}
        </div>
      </header>

      <main className="grid">
        <section className="panel status-panel">
          <div className="panel-header">
            <h2>Connection</h2>
            <span className="caption">Last sync: {lastUpdatedAt ?? "waiting"}</span>
          </div>
          <div className="status-block">
            <div className={`status ${status?.status === "online" ? "ok" : "warn"}`}>
              {formatStatus(status?.status)}
            </div>
            <div className="status-meta">
              <div>
                <span className="label">Failures</span>
                <span>{status?.failureCount ?? "-"}</span>
              </div>
              <div>
                <span className="label">Last check</span>
                <span>{lastCheckedAt}</span>
              </div>
            </div>
          </div>
          {error ? <p className="error">Agent error: {error}</p> : null}
        </section>

        <section className="panel control-panel">
          <div className="panel-header">
            <h2>Adapter control</h2>
            <span className="caption">{adapters.length} adapters</span>
          </div>
          <label className="field">
            <span>Active adapter</span>
            <select
              value={selectedAdapter}
              onChange={(event) => setSelectedAdapter(event.target.value)}
              disabled={!isAgentOnline || adapters.length === 0}
            >
              {adapters.map((adapter) => (
                <option key={adapter.name} value={adapter.name}>
                  {adapter.name} ({adapter.status})
                </option>
              ))}
            </select>
          </label>
          {adapters.length === 0 ? (
            <p className="muted">No adapters detected yet.</p>
          ) : null}
          <div className="config-grid">
            <label className="field">
              <span>Ping target</span>
              <input
                type="text"
                value={pingTarget}
                onChange={(event) => setPingTarget(event.target.value)}
                placeholder="8.8.8.8"
              />
            </label>
            <label className="field">
              <span>Retry count</span>
              <input
                type="number"
                min={1}
                value={retryCount}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setRetryCount(Number.isNaN(next) ? 0 : next);
                }}
              />
            </label>
            <label className="field">
              <span>Retry interval (ms)</span>
              <input
                type="number"
                min={1000}
                step={500}
                value={retryIntervalMs}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setRetryIntervalMs(Number.isNaN(next) ? 0 : next);
                }}
              />
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="ghost"
              onClick={handleApplyConfig}
              disabled={!isAgentOnline || configSaving}
            >
              {configSaving ? "Saving..." : "Apply config"}
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleReset}
              disabled={!isAgentOnline || resetting}
            >
              {resetting ? "Resetting..." : "Reset now"}
            </button>
          </div>
          {configMessage ? <p className="feedback">{configMessage}</p> : null}
          {resetMessage ? <p className="feedback">{resetMessage}</p> : null}
        </section>

        <section className="panel events-panel">
          <div className="panel-header">
            <h2>Activity</h2>
            <span className="caption">{events.length} events</span>
          </div>
          <ul className="events">
            {events.length === 0 ? (
              <li className="event empty">No recent events.</li>
            ) : (
              events.map((event) => (
                <li key={event.id} className="event">
                  <div className="event-message">{event.message}</div>
                  <div className="event-meta">{event.timestamp}</div>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
