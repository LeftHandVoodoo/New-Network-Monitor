import { useState } from "react";

const initialStatus = "Unknown";

export default function App() {
  const [status, setStatus] = useState(initialStatus);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Network Monitor</h1>
        <p className="subtitle">Connectivity watcher with adapter reset on disconnect.</p>
      </header>

      <section className="status-card">
        <div className="status-row">
          <span className="label">Connection status</span>
          <span className={`status ${status === "Online" ? "ok" : "warn"}`}>{status}</span>
        </div>
        <p className="hint">Status updates will be provided by the local service/agent.</p>
      </section>

      <section className="actions">
        <button
          type="button"
          onClick={() => setStatus(status === "Online" ? "Offline" : "Online")}
        >
          Toggle Status (demo)
        </button>
      </section>
    </div>
  );
}
