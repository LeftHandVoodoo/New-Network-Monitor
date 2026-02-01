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
