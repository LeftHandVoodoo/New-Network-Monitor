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
