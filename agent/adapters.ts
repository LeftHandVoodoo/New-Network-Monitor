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
