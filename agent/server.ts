import { createServer as createHttpServer } from "node:http";

const ALLOWED_ORIGIN_PREFIXES = ["http://localhost:", "http://127.0.0.1:"];

type ServerDeps = {
  token: string;
  getStatus: () => Promise<{ status: string; failureCount: number; lastCheckedAt: string }>;
  listAdapters: () => Promise<unknown[]>;
  updateConfig: (body: unknown) => Promise<void>;
  resetAdapter: () => Promise<{ ok: boolean }>;
  getEvents: () => Promise<unknown[]>;
};

function applyCors(req: Parameters<typeof createHttpServer>[0], res: Parameters<typeof createHttpServer>[1]) {
  const origin = req.headers.origin;
  const allowOrigin =
    typeof origin === "string" &&
    ALLOWED_ORIGIN_PREFIXES.some((prefix) => origin.startsWith(prefix));

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "X-IPC-Token, Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
}

export function createServer(deps: ServerDeps) {
  return createHttpServer(async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

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
