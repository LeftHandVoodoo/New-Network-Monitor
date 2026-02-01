# Architecture Overview

## Introduction

Network Monitor is a Windows desktop GUI app that watches internet connectivity and triggers a network adapter reset when the connection drops. The UI is built with React + TypeScript.

## System Context

```
[Internet] <--> [Windows Network Stack] <--> [Network Monitor Agent] <--> [GUI]
```

## High-Level Architecture

### Components

- **GUI (React + TypeScript):** Status visualization, alerts, and manual controls.
- **Local Agent (TBD):** Performs connectivity checks and adapter reset operations with elevated privileges.
- **Adapter Reset Script:** PowerShell or native command invoked by the agent.

## Data Flow

1. Agent performs periodic connectivity checks.
2. Agent emits status updates to the GUI.
3. On disconnect, agent issues adapter reset command.
4. GUI displays the latest status and events.

## Technology Stack

| Layer | Technology | Purpose |
|------|------------|---------|
| GUI | React + TypeScript | User interface |
| Build | Vite | Tooling |
| Agent | Node.js / PowerShell (TBD) | Privileged operations |

## Security Architecture

- Adapter reset requires elevated privileges.
- GUI should not execute privileged operations directly.
- Agent must validate requests and log actions.

## Deployment Architecture

- Desktop app packaging: TBD (Electron/Tauri/Native wrapper).
- Runs locally on Windows with administrator permissions where required.

## Key Design Decisions

See [Architecture Decision Records](adr/) for detailed rationale.
