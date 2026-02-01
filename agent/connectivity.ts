export type ConnectivitySnapshot = {
  profileOnline: boolean;
  pingOk: boolean;
  checkedAt: string;
};

export function parseConnectivityProfiles(json: string): boolean {
  if (!json) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return false;
  }

  if (parsed === null) return false;

  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    const record = item as { IPv4Connectivity?: unknown; IPv6Connectivity?: unknown };
    const ipv4 = String(record.IPv4Connectivity ?? "");
    const ipv6 = String(record.IPv6Connectivity ?? "");
    return (
      ipv4 === "Internet" ||
      ipv4 === "LocalNetwork" ||
      ipv6 === "Internet" ||
      ipv6 === "LocalNetwork"
    );
  });
}
