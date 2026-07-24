/**
 * Unique element id/name generation. Feeds the value-pattern dimension of a
 * fingerprint (id||name||type), so distinct ids → distinct attributes.
 */
export function uid(n: number): string {
  return (n >>> 0).toString(36);
}

/** Stable-per-render unique id from a labeler base + local index. */
export function elId(base: number, i: number, prefix = "el"): string {
  return `${prefix}_${uid(base + i * 2654435761)}`;
}

export function elName(base: number, i: number): string {
  return `field_${uid(base + i * 40503)}`;
}
