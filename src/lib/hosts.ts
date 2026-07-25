/**
 * Synthetic internal service endpoints for the fake intranet. Each sub-app is
 * presented as if it were a distinct internal service with its own hostname,
 * private-range IP and port — the way a real corporate service catalogue looks.
 *
 * NONE of these are real infrastructure. IPs are generated deterministically in
 * the private 10.68.0.0/16 block; hostnames use the reserved `.local` suffix.
 * They are cosmetic (reinforce "distinct origin per app") and give QA a stable
 * address list to reference. On GitHub Pages everything is still one origin.
 */

/** Services that conventionally run on a non-443 port get a realistic one. */
const PORT_BY_ID: Record<string, number> = {
  jenkins: 8080,
  monitoring: 3000, // Grafana
  kibana: 5601,
  git: 8443,
  bitbucket: 7990,
  sap: 8000,
  zoom: 8801,
  slack: 8443,
};

export interface Endpoint {
  host: string;
  ip: string;
  port: number;
}

/** `servicenow.corp.acme.local` — stable per app id. */
export function hostFor(id: string): string {
  return `${id.replace(/[^a-z0-9]/g, "")}.corp.acme.local`;
}

/** Deterministic, collision-free endpoint for the app at catalogue index `idx`. */
export function endpointFor(id: string, idx: number): Endpoint {
  const octet3 = 12 + Math.floor(idx / 12); // 12..15 across the catalogue
  const octet4 = 21 + ((idx % 12) * 9); // 21..120, unique within each /24 group
  return {
    host: hostFor(id),
    ip: `10.68.${octet3}.${octet4}`,
    port: PORT_BY_ID[id] ?? 443,
  };
}
