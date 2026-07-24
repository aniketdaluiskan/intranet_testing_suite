import { QUALIFIERS, NOUNS, SUFFIXES, VERBS, TAGS } from "./words";

/**
 * Bijective label generation. Each integer n maps to a distinct English phrase
 * via mixed-radix decomposition over the word pools, so:
 *   - labels are always valid English words, and
 *   - distinct n → distinct label (unique within a render).
 *
 * The period (pool-size product) is ~10^5–10^6, far larger than the labels on
 * any page, so a page that consumes a contiguous block of n values gets all
 * unique labels.
 */

function idx(n: number, len: number): [number, number] {
  return [((n % len) + len) % len, Math.floor(n / len)];
}

/** Field/data label, e.g. "Quarterly Vendor Register". */
export function fieldLabel(n: number): string {
  let r = n >>> 0;
  let a, b, c;
  [a, r] = idx(r, QUALIFIERS.length);
  [b, r] = idx(r, NOUNS.length);
  [c, r] = idx(r, SUFFIXES.length);
  return `${QUALIFIERS[a]} ${NOUNS[b]} ${SUFFIXES[c]}`;
}

/** Action/button label, e.g. "Approve Regional Invoice". */
export function actionLabel(n: number): string {
  let r = n >>> 0;
  let a, b, c;
  [a, r] = idx(r, VERBS.length);
  [b, r] = idx(r, QUALIFIERS.length);
  [c, r] = idx(r, NOUNS.length);
  return `${VERBS[a]} ${QUALIFIERS[b]} ${NOUNS[c]}`;
}

/** Section/nav label, e.g. "Compliance Incident". */
export function sectionLabel(n: number): string {
  let r = n >>> 0;
  let a, b;
  [a, r] = idx(r, QUALIFIERS.length);
  [b, r] = idx(r, NOUNS.length);
  return `${QUALIFIERS[a]} ${NOUNS[b]}`;
}

/** Single-word tag, e.g. "Starred". */
export function tagLabel(n: number): string {
  return TAGS[(((n % TAGS.length) + TAGS.length) % TAGS.length)];
}

/**
 * A labeler bound to a churn base. `base` is derived from the churn tick + a
 * component salt so labels change on every navigation/interaction and don't
 * collide between components in the same render.
 */
export interface Labeler {
  base: number;
  field: (i: number) => string;
  action: (i: number) => string;
  section: (i: number) => string;
  tag: (i: number) => string;
}

export function makeLabeler(tick: number, salt: number): Labeler {
  // Spread components far apart so their contiguous index ranges never overlap.
  const base = (tick * 1_000_003 + salt * 10_007) >>> 0;
  return {
    base,
    field: (i) => fieldLabel(base + i),
    action: (i) => actionLabel(base + i * 7 + 3),
    section: (i) => sectionLabel(base + i * 13 + 5),
    tag: (i) => tagLabel(base + i),
  };
}
