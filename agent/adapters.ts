import { Adapter } from "./types.js";
import { runPowerShell } from "./powershell.js";

export function parseAdapters(json: string): Adapter[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return [];
  }

  if (parsed === null) return [];

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const adapters: Adapter[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as { Name?: unknown; Status?: unknown; InterfaceType?: unknown };
    adapters.push({
      name: String(record.Name ?? ""),
      status: String(record.Status ?? ""),
      type: String(record.InterfaceType ?? "")
    });
  }

  return adapters;
}

export async function listAdapters(): Promise<Adapter[]> {
  const command =
    "Get-NetAdapter -ErrorAction Stop | Select-Object Name, Status, InterfaceType | ConvertTo-Json";
  const output = await runPowerShell(command);
  return parseAdapters(output);
}
