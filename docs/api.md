# API Reference

## Overview

This document describes the IPC/API surface between the GUI and the local agent. The interface is not finalized yet.

## Proposed IPC Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| `status:subscribe` | GUI -> Agent | Subscribe to connectivity updates |
| `status:update` | Agent -> GUI | Push status updates |
| `adapter:reset` | GUI -> Agent | Request adapter reset |
| `adapter:result` | Agent -> GUI | Result of adapter reset |

## Payload Examples

```json
{ "status": "offline", "timestamp": "2026-02-01T12:00:00Z" }
```

```json
{ "adapter": "Wi-Fi", "result": "success" }
```
