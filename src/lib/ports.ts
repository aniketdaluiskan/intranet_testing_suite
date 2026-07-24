/**
 * Multi-port awareness. `serve-ports.mjs` injects `window.__MULTIPORT__ = true`
 * into the served HTML; when present, the portal opens each sub-app on its own
 * dedicated origin (:5174, :5175, …) and the in-app Home button returns to the
 * portal origin (:5173). Under `npm run dev` (single Vite server) none of this is
 * set, so navigation stays in-SPA on :5173.
 */
export const PORTAL_PORT = 5173;
export const APP_PORT_BASE = 5174;

export function multiPort(): boolean {
  return typeof window !== "undefined" && (window as unknown as { __MULTIPORT__?: boolean }).__MULTIPORT__ === true;
}

export function appPortOrigin(idx: number): string {
  return `${window.location.protocol}//${window.location.hostname}:${APP_PORT_BASE + idx}/`;
}

export function portalOrigin(): string {
  return `${window.location.protocol}//${window.location.hostname}:${PORTAL_PORT}/`;
}
