/**
 * Pure route matcher — no React, no DOM — unit-testable under Node.
 *
 * Supports:
 *   - static segments        "/copilot"        (score +2 each)
 *   - dynamic segments       "/:appId"         (score +1 each)
 *   - trailing splat         "/:appId/*"       (captures the rest into params["*"], score -0.5)
 *   - full catch-all         "*"               (score -1)
 * Higher score wins; ties resolve to first declared.
 */
export interface RouteDef<E = unknown> {
  path: string;
  element: E;
}

export interface MatchResult<E = unknown> {
  def: RouteDef<E>;
  params: Record<string, string>;
}

export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function matchPrefix(
  psegs: string[],
  segs: string[],
  params: Record<string, string>,
): number | null {
  let score = 0;
  for (let i = 0; i < psegs.length; i++) {
    const p = psegs[i];
    const s = segs[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = safeDecode(s);
      score += 1;
    } else if (p === s) {
      score += 2;
    } else {
      return null;
    }
  }
  return score;
}

export function matchRoutes<E>(
  routes: RouteDef<E>[],
  pathname: string,
): MatchResult<E> | null {
  const segs = pathname.split("/").filter(Boolean);
  let best: MatchResult<E> | null = null;
  let bestScore = -Infinity;

  for (const def of routes) {
    if (def.path === "*") {
      if (-1 > bestScore) {
        bestScore = -1;
        best = { def, params: {} };
      }
      continue;
    }

    const psegs = def.path.split("/").filter(Boolean);
    const hasSplat = psegs[psegs.length - 1] === "*";

    if (hasSplat) {
      const prefix = psegs.slice(0, -1);
      if (segs.length < prefix.length) continue;
      const params: Record<string, string> = {};
      const prefixScore = matchPrefix(prefix, segs.slice(0, prefix.length), params);
      if (prefixScore === null) continue;
      params["*"] = segs.slice(prefix.length).join("/");
      const score = prefixScore - 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = { def, params };
      }
    } else {
      if (psegs.length !== segs.length) continue;
      const params: Record<string, string> = {};
      const score = matchPrefix(psegs, segs, params);
      if (score === null) continue;
      if (score > bestScore) {
        bestScore = score;
        best = { def, params };
      }
    }
  }
  return best;
}
