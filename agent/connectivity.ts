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
