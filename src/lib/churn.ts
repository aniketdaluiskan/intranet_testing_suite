import { uid } from "./ids";

/** URL-safe slug from a generated English label. */
export function slug(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "view"
  );
}

/** A rotating token so every interaction produces a new, unique pathname.
 * Prefixed with a letter so the segment is NEVER purely numeric — purely numeric
 * path segments are commonly pruned upstream, which would collapse `/12345`
 * variants. `rec-a7f3` survives. */
export function churnToken(tick: number, i = 0): string {
  return "rec-" + uid((tick * 2654435761 + i * 40503) >>> 0);
}

/** e.g. /jira/quarterly-vendor-register/k3f9 — changes on every click. */
export function viewPath(appId: string, label: string, tick: number, i = 0): string {
  return `/${appId}/${slug(label)}/${churnToken(tick, i)}`;
}

/** Deeper item path, e.g. /servicenow/incident/inc/k3f9 */
export function itemPath(
  appId: string,
  kind: string,
  label: string,
  tick: number,
  i = 0,
): string {
  return `/${appId}/${slug(kind)}/${slug(label)}/${churnToken(tick, i)}`;
}
