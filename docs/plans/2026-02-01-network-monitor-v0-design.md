# Network Monitor v0 Design (2026-02-01)

## Summary

Build a Windows desktop monitoring tool with a React UI and a local elevated agent. The UI is a Vite app that communicates over localhost to a Node.js agent that performs connectivity checks and adapter resets using PowerShell. The UI does not execute privileged operations directly.

## Goals

- Monitor connectivity with an initial Windows status check, then confirm with ping to 8.8.8.8.
- Reset a user-selected adapter after 3 failed pings at 5-second intervals.
- Provide a simple UI for status, adapter selection, manual reset, and activity log.
- Keep privileged operations isolated in a local elevated agent.

## Non-Goals (v0)

- Windows Service or installer packaging.
- Advanced scheduling or background tasks when UI is closed.
- Multi-machine or remote management.

## Architecture

- **UI (React + TypeScript)**: status visualization, adapter selection, manual reset, configuration, and activity log.
- **Local Agent (Node.js)**: elevated process exposing a localhost HTTP JSON API.
- **PowerShell Runner**: `Get-NetAdapter`, `Get-NetConnectionProfile`, `Test-Connection`, `Restart-NetAdapter`.

The UI launches the agent using `Start-Process -Verb RunAs`, passing an IPC token and configuration via env vars. The agent binds to `127.0.0.1` only.

## Data Flow

1. UI starts and generates a random IPC token.
2. UI launches the agent elevated with env vars (PORT, LOG_LEVEL, IPC_TOKEN).
3. UI polls `GET /health` until ready.
4. UI fetches adapter list from `GET /adapters` and populates dropdown.
5. User selection is sent to `POST /config` (adapter name, ping target, retry policy).
6. Agent performs Windows status check, then ping confirmation.
7. After 3 failed pings at 5-second intervals, agent runs reset.
8. UI polls `GET /status` and appends events to the activity log.

## IPC Surface (HTTP + JSON)

All requests require header `X-IPC-Token`.

- `GET /health`
- `GET /status` (current connectivity, active adapter, failure counters)
- `GET /adapters` (name, status, type)
- `POST /config` (adapter, pingTarget, retryCount, retryIntervalMs)
- `POST /reset` (manual reset)
- `GET /events` (optional rolling feed for UI log)

## UI Behavior

- Disable dropdown until adapters load.
- Show agent connection state and a restart CTA on failure.
- Provide default config: ping target `8.8.8.8`, retry count `3`, interval `5s`.
- Manual "Reset Now" button triggers `POST /reset`.

## Error Handling

- Agent returns structured JSON errors (status, message, detail).
- Invalid adapter name returns 400 and is surfaced in the UI log.
- Reset failure is logged and shown but does not crash the agent.
- If no adapters are found, show a clear UI message.

## Logging

- UI uses `src/utils/logger.ts`.
- Agent logs structured JSON to stdout/stderr.

## Testing

- Agent unit tests mock PowerShell execution and verify:
  - Adapter parsing.
  - Retry counter logic.
  - Reset trigger after 3 failed pings.
- UI tests (Vitest + React Testing Library) for:
  - Status rendering.
  - Adapter dropdown flow.
  - Error states.

## Risks

- PowerShell command output parsing may vary by Windows version.
- UAC prompts are disruptive; acceptable for v0.

## Next Steps

- Implement agent in `src/agent/` or a sibling package.
- Implement UI screens and wiring.
- Add tests and update CHANGELOG.
