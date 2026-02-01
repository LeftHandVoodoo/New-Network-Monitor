# V0 Agent + UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a Vite React UI that talks to an elevated local Node agent which monitors connectivity and resets a selected adapter after 3 failed pings.

**Architecture:** A localhost HTTP JSON agent (Node) handles PowerShell calls and monitoring. The UI polls the agent for status and displays controls for adapter selection, manual reset, and configuration.

**Tech Stack:** TypeScript, React, Vite, Vitest, Node.js 20, PowerShell.

---

### Task 1: Tooling baseline for agent + UI tests

**Files:**
- Modify: `package.json`
- Create: `tsconfig.agent.json`
- Modify: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/ui/setup.test.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Demo() {
  return <h1>Ready</h1>;
}

describe("testing setup", () => {
  it("has jest-dom matchers", () => {
    render(<Demo />);
    expect(screen.getByRole("heading", { name: /ready/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/ui/setup.test.tsx`
Expected: FAIL with missing `@testing-library/react` and/or `toBeInTheDocument` matcher.

**Step 3: Write minimal implementation**

- Install dev deps:
  `npm install -D @types/node tsx @testing-library/react @testing-library/jest-dom @testing-library/user-event`
- Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom";
```

- Update `vitest.config.ts` to add setup file:

```ts
test: {
  globals: true,
  environment: "jsdom",
  setupFiles: ["tests/setup.ts"],
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "html"]
  }
}
```

- Create `tsconfig.agent.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "agent",
    "outDir": "agent-dist",
    "strict": true,
    "types": ["node"]
  },
  "include": ["agent"]
}
```

- Update `package.json` scripts:
  - `agent:dev`: `tsx agent/index.ts`
  - `agent:build`: `tsc -p tsconfig.agent.json`
  - `agent:start`: `node agent-dist/index.js`
  - `typecheck`: `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.agent.json --noEmit`

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/ui/setup.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.agent.json tests/setup.ts tests/ui/setup.test.tsx
git commit -m "test: add ui test harness and agent tooling"
```

---

### Task 2: Agent adapter parsing + PowerShell runner

**Files:**
- Create: `agent/types.ts`
- Create: `agent/powershell.ts`
- Create: `agent/adapters.ts`
- Create: `tests/agent/adapters.test.ts`

**Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseAdapters } from "../../agent/adapters";

describe("parseAdapters", () => {
  it("normalizes adapter list", () => {
    const json = JSON.stringify([
      { Name: "Wi-Fi", Status: "Up", InterfaceType: "Wireless80211" },
      { Name: "Ethernet", Status: "Down", InterfaceType: "Ethernet" }
    ]);

    const result = parseAdapters(json);
    expect(result).toEqual([
      { name: "Wi-Fi", status: "Up", type: "Wireless80211" },
      { name: "Ethernet", status: "Down", type: "Ethernet" }
    ]);
  });

  it("handles single object payload", () => {
    const json = JSON.stringify({ Name: "Wi-Fi", Status: "Up", InterfaceType: "Wireless80211" });
    const result = parseAdapters(json);
    expect(result).toEqual([{ name: "Wi-Fi", status: "Up", type: "Wireless80211" }]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/agent/adapters.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create `agent/types.ts`:

```ts
export type Adapter = {
  name: string;
  status: string;
  type: string;
};
```

Create `agent/powershell.ts`:

```ts
import { spawn } from "node:child_process";

export async function runPowerShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command
    ]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `PowerShell exited with ${code}`));
      }
    });
  });
}
```

Create `agent/adapters.ts`:

```ts
import { Adapter } from "./types";
import { runPowerShell } from "./powershell";

export function parseAdapters(json: string): Adapter[] {
  if (!json) return [];
  const parsed = JSON.parse(json) as unknown;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.map((item: any) => ({
    name: String(item.Name ?? ""),
    status: String(item.Status ?? ""),
    type: String(item.InterfaceType ?? "")
  }));
}

export async function listAdapters(): Promise<Adapter[]> {
  const command =
    "Get-NetAdapter | Select-Object Name, Status, InterfaceType | ConvertTo-Json";
  const output = await runPowerShell(command);
  return parseAdapters(output);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/agent/adapters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add agent/types.ts agent/powershell.ts agent/adapters.ts tests/agent/adapters.test.ts
git commit -m "feat: add adapter parsing utilities"
```

---

### Task 3: Connectivity parsing + monitor logic

**Files:**
- Create: `agent/connectivity.ts`
- Create: `agent/monitor.ts`
- Create: `tests/agent/monitor.test.ts`

**Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { nextMonitorState } from "../../agent/monitor";

const base = {
  status: "offline",
  failureCount: 0,
  lastCheckedAt: "2026-02-01T00:00:00Z"
};

describe("monitor", () => {
  it("triggers reset after 3 failed pings", () => {
    let state = base;
    const now = "2026-02-01T00:00:05Z";
    state = nextMonitorState(state, { profileOnline: false, pingOk: false, now });
    state = nextMonitorState(state, { profileOnline: false, pingOk: false, now });
    const final = nextMonitorState(state, { profileOnline: false, pingOk: false, now });

    expect(final.failureCount).toBe(3);
    expect(final.shouldReset).toBe(true);
  });

  it("clears failure count on successful ping", () => {
    const state = nextMonitorState(
      { ...base, failureCount: 2 },
      { profileOnline: true, pingOk: true, now: "2026-02-01T00:00:05Z" }
    );

    expect(state.failureCount).toBe(0);
    expect(state.shouldReset).toBe(false);
    expect(state.status).toBe("online");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/agent/monitor.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create `agent/connectivity.ts`:

```ts
export type ConnectivitySnapshot = {
  profileOnline: boolean;
  pingOk: boolean;
  checkedAt: string;
};

export function parseConnectivityProfiles(json: string): boolean {
  if (!json) return false;
  const parsed = JSON.parse(json) as any;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.some((item) => {
    const ipv4 = String(item.IPv4Connectivity ?? "");
    const ipv6 = String(item.IPv6Connectivity ?? "");
    return ipv4 === "Internet" || ipv4 === "LocalNetwork" || ipv6 === "Internet";
  });
}
```

Create `agent/monitor.ts`:

```ts
export type MonitorState = {
  status: "online" | "offline";
  failureCount: number;
  lastCheckedAt: string;
};

export type MonitorInput = {
  profileOnline: boolean;
  pingOk: boolean;
  now: string;
};

export type MonitorDecision = MonitorState & { shouldReset: boolean };

export function nextMonitorState(state: MonitorState, input: MonitorInput): MonitorDecision {
  const online = input.profileOnline && input.pingOk;
  const failureCount = online ? 0 : state.failureCount + 1;

  return {
    status: online ? "online" : "offline",
    failureCount,
    lastCheckedAt: input.now,
    shouldReset: !online && failureCount >= 3
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/agent/monitor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add agent/connectivity.ts agent/monitor.ts tests/agent/monitor.test.ts
git commit -m "feat: add connectivity parsing and monitor logic"
```

---

### Task 4: HTTP server with token auth + status endpoints

**Files:**
- Create: `agent/server.ts`
- Create: `tests/agent/server.test.ts`

**Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../agent/server";

let baseUrl = "";
let server: ReturnType<typeof createServer> | null = null;

beforeAll(async () => {
  server = createServer({
    token: "test-token",
    getStatus: async () => ({ status: "online", failureCount: 0, lastCheckedAt: "" }),
    listAdapters: async () => [],
    updateConfig: async () => undefined,
    resetAdapter: async () => ({ ok: true }),
    getEvents: async () => []
  });

  await new Promise<void>((resolve) => {
    server!.listen(0, () => resolve());
  });

  const address = server!.address();
  if (typeof address === "object" && address) {
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

describe("server auth", () => {
  it("rejects requests without token", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(401);
  });

  it("accepts token and returns health", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { "X-IPC-Token": "test-token" }
    });
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/agent/server.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create `agent/server.ts`:

```ts
import { createServer as createHttpServer } from "node:http";

type ServerDeps = {
  token: string;
  getStatus: () => Promise<{ status: string; failureCount: number; lastCheckedAt: string }>;
  listAdapters: () => Promise<unknown[]>;
  updateConfig: (body: unknown) => Promise<void>;
  resetAdapter: () => Promise<{ ok: boolean }>;
  getEvents: () => Promise<unknown[]>;
};

export function createServer(deps: ServerDeps) {
  return createHttpServer(async (req, res) => {
    const token = req.headers["x-ipc-token"];
    if (token !== deps.token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url === "/status" && req.method === "GET") {
      const status = await deps.getStatus();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    if (req.url === "/adapters" && req.method === "GET") {
      const adapters = await deps.listAdapters();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(adapters));
      return;
    }

    if (req.url === "/events" && req.method === "GET") {
      const events = await deps.getEvents();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(events));
      return;
    }

    if (req.url === "/reset" && req.method === "POST") {
      const result = await deps.resetAdapter();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.url === "/config" && req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        await deps.updateConfig(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/agent/server.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add agent/server.ts tests/agent/server.test.ts
git commit -m "feat: add agent http server"
```

---

### Task 5: UI agent client + App integration

**Files:**
- Create: `src/api/agentClient.ts`
- Create: `src/hooks/useAgentStatus.ts`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Create: `tests/ui/agentClient.test.ts`
- Create: `tests/ui/app.test.tsx`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { createAgentClient } from "../../src/api/agentClient";

describe("agent client", () => {
  it("adds ipc token header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const client = createAgentClient({ baseUrl: "http://127.0.0.1:8787", token: "abc", fetchImpl });

    await client.health();

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/health",
      expect.objectContaining({ headers: { "X-IPC-Token": "abc" } })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/ui/agentClient.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create `src/api/agentClient.ts`:

```ts
type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export function createAgentClient(options: {
  baseUrl: string;
  token: string;
  fetchImpl?: FetchLike;
}) {
  const fetcher = options.fetchImpl ?? fetch;
  const headers = { "X-IPC-Token": options.token };

  async function get<T>(path: string): Promise<T> {
    const res = await fetcher(`${options.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetcher(`${options.baseUrl}${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    health: () => get<{ ok: boolean }>("/health"),
    status: () => get<{ status: string; failureCount: number; lastCheckedAt: string }>("/status"),
    adapters: () => get<Array<{ name: string; status: string; type: string }>>("/adapters"),
    events: () => get<Array<{ id: string; message: string; timestamp: string }>>("/events"),
    updateConfig: (body: unknown) => post("/config", body),
    reset: () => post<{ ok: boolean }>("/reset", {})
  };
}
```

Create `src/hooks/useAgentStatus.ts` (minimal polling hook). Update `src/App.tsx` to use it and render:
- connection state
- adapter dropdown
- ping config inputs
- manual reset button
- events list

Update `src/index.css` for basic layout.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/ui/agentClient.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/agentClient.ts src/hooks/useAgentStatus.ts src/App.tsx src/index.css tests/ui/agentClient.test.ts tests/ui/app.test.tsx
git commit -m "feat: add ui agent client and status view"
```

---

### Task 6: Agent runtime wiring + docs

**Files:**
- Create: `agent/config.ts`
- Create: `agent/index.ts`
- Create: `tests/agent/config.test.ts`
- Create: `scripts/start-agent.ps1`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readAgentConfig } from "../../agent/config";

process.env.PORT = "8787";
process.env.IPC_TOKEN = "token";

describe("agent config", () => {
  it("reads required env vars", () => {
    const config = readAgentConfig();
    expect(config.port).toBe(8787);
    expect(config.token).toBe("token");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/agent/config.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

Create `agent/config.ts`:

```ts
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
```

Create `agent/index.ts` to wire monitor + server, and add `scripts/start-agent.ps1` to run elevated.
Update `.env.example` with:
- `IPC_TOKEN`
- `PING_TARGET`
- `RETRY_COUNT`
- `RETRY_INTERVAL_MS`
- `VITE_AGENT_PORT`
- `VITE_IPC_TOKEN`
Update `README.md` with run steps for agent + UI.
Update `CHANGELOG.md` under Unreleased.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/agent/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add agent/config.ts agent/index.ts scripts/start-agent.ps1 .env.example README.md CHANGELOG.md tests/agent/config.test.ts
git commit -m "feat: add agent runtime and docs"
```

---

**Note:** Use @superpowers:test-driven-development for each task, and @superpowers:verification-before-completion before claiming success.
