/**
 * Attribute-capacity model — the single source of truth for BOTH:
 *   1. how many valid/invalid attribute-bearing elements each block renders, and
 *   2. the per-app "possible attributes (valid / invalid)" shown on the portal.
 *
 * Definitions used consistently across the app:
 *   VALID attribute   = a control with a non-empty English label bound to a
 *                       value/typed input (proper label→value pair, well-formed
 *                       id/name). These are kept.
 *   INVALID attribute = an attribute-shaped element that is malformed: empty /
 *                       whitespace label, a label with no associated value, an
 *                       icon-only control, or a value with no label. These are
 *                       the ones the pipeline should reject / flag.
 *
 * Counts are "per rendered block instance". A block renders exactly `valid`
 * valid controls and `invalid` invalid ones, so the portal numbers are real.
 */
export type BlockKind =
  | "table"
  | "form"
  | "chat"
  | "kanban"
  | "dashboard"
  | "doc"
  | "mail"
  | "repo"
  | "build"
  | "cards";

export interface Cap {
  valid: number;
  invalid: number;
}

/**
 * Per-rendered-block valid/invalid counts. AttributeFill renders exactly these,
 * so the portal tile numbers equal the DOM. Sized (with KIND_VIEWS) so a full
 * pass of all apps totals the capacity target. To scale further, bump these or
 * KIND_VIEWS (or rely on churn multiplying over a real session since every
 * navigation regenerates unique labels).
 */
export const BLOCK_CAP: Record<BlockKind, Cap> = {
  table: { valid: 176, invalid: 24 },
  form: { valid: 120, invalid: 32 },
  chat: { valid: 104, invalid: 16 },
  kanban: { valid: 144, invalid: 20 },
  dashboard: { valid: 88, invalid: 24 },
  doc: { valid: 112, invalid: 40 },
  mail: { valid: 128, invalid: 20 },
  repo: { valid: 104, invalid: 16 },
  build: { valid: 88, invalid: 16 },
  cards: { valid: 96, invalid: 16 },
};

export interface AppCapacity {
  valid: number;
  invalid: number;
  total: number;
  perView: Cap;
}

/**
 * Attributes possible in one full pass of the app (visit every view once).
 * `views` = sidebar sections × tabs. Because labels/ids churn on every
 * navigation, a real session yields far more than one pass — this is the
 * per-pass baseline capacity used for test planning.
 */
export function appCapacity(blocks: BlockKind[], views: number): AppCapacity {
  const perView = blocks.reduce<Cap>(
    (acc, b) => ({
      valid: acc.valid + BLOCK_CAP[b].valid,
      invalid: acc.invalid + BLOCK_CAP[b].invalid,
    }),
    { valid: 0, invalid: 0 },
  );
  return {
    perView,
    valid: perView.valid * views,
    invalid: perView.invalid * views,
    total: (perView.valid + perView.invalid) * views,
  };
}
