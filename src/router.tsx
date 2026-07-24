import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { matchRoutes, type RouteDef } from "./routing/match";

/**
 * Minimal history-API router (self-contained, no routing dependency). Real
 * pushState → real URL changes + real history entries, which is what a
 * DOM-capture agent needs. `location.key` increments on every navigation and is used app-wide as
 * the "churn tick" that regenerates labels/PII on each interaction.
 */
export interface Location {
  pathname: string;
  search: string;
  key: number;
}

// Base path under which the app is served (e.g. "/Extension_Testing_Suite" on
// GitHub Pages, "" locally). Routes are matched base-relative.
const BASE = (
  (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/"
).replace(/\/+$/, "");
function stripBase(p: string): string {
  if (BASE && (p === BASE || p.startsWith(BASE + "/"))) return p.slice(BASE.length) || "/";
  return p || "/";
}

let current: Location = {
  pathname: stripBase(window.location.pathname),
  search: window.location.search,
  key: 0,
};
const listeners = new Set<() => void>();

function refresh(): void {
  current = {
    pathname: stripBase(window.location.pathname),
    search: window.location.search,
    key: current.key + 1,
  };
  listeners.forEach((l) => l());
}

export function navigate(to: string): void {
  const u = new URL(to, window.location.origin);
  const full = BASE + u.pathname + u.search + u.hash; // prepend base for the real URL
  const cur = window.location.pathname + window.location.search + window.location.hash;
  if (full === cur) {
    // Same URL: still bump the key so labels churn on repeat clicks.
    refresh();
    return;
  }
  window.history.pushState({}, "", full);
  refresh();
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", refresh);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot(): Location {
  return current;
}

export function useLocation(): Location {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useNavigate(): (to: string) => void {
  return navigate;
}

const ParamsCtx = createContext<Record<string, string>>({});
export function useParams<
  T extends Record<string, string> = Record<string, string>,
>(): T {
  return useContext(ParamsCtx) as T;
}

export function BrowserRouter({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Route(_props: { path: string; element: ReactNode }): null {
  return null;
}

export function Routes({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const routes: RouteDef<ReactNode>[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const el = child as ReactElement<{ path?: string; element?: ReactNode }>;
      if (typeof el.props.path === "string") {
        routes.push({ path: el.props.path, element: el.props.element ?? null });
      }
    }
  });
  const m = matchRoutes(routes, loc.pathname);
  if (!m) return null;
  return <ParamsCtx.Provider value={m.params}>{m.def.element}</ParamsCtx.Provider>;
}
