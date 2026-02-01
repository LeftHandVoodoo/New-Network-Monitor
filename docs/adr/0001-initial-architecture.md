# ADR-0001: Initial Architecture Decisions

## Status

Accepted

## Context

This project is being initialized and requires foundational architectural decisions to guide development.

## Decision

We will adopt the following foundation:

### Technology Stack
- **GUI:** React + TypeScript
- **Build:** Vite
- **Agent (privileged operations):** Node.js + PowerShell (initial plan)

### Project Structure
- Separate GUI and agent concerns
- Keep privileged operations behind a local agent boundary

### Code Quality
- ESLint + Prettier for formatting/linting
- Vitest for tests

### Documentation
- Maintain docs/architecture.md for system design
- Maintain docs/api.md for IPC/API surface
- Record decisions in docs/adr/

## Consequences

### Positive
- Clear separation between UI and privileged operations
- Auditability for adapter reset actions

### Negative
- Requires an additional local agent process

### Neutral
- Packaging choice (Electron/Tauri) remains open

## References
- docs/architecture.md
- docs/api.md
