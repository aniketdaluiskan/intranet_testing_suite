/**
 * Cross-app entity roster. A small, SESSION-STABLE set of people (name + matching email) that
 * recur identically across every app in a session — so the VA's entity-resolution can be tested
 * across origins (the same "Alex Carter <alex.carter@…>" shows up in ServiceNow, Outlook, CRM…).
 *
 * Seeded from the session id (not the per-app churn tick), so it's the SAME roster everywhere in a
 * session but a different roster on the next fresh load / Session-tag change. Slot-stable too: record
 * k maps to the same person across churn, which is more realistic than re-rolling the customer on
 * every navigation (only the surrounding metadata churns).
 */
import { pii } from "./pii";
import { getSessionId } from "../session";

export const ENTITY_COUNT = 12;

function sessionSeed(): number {
  const s = getSessionId();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

/** The person at roster slot n (wraps at ENTITY_COUNT). name + email are a matching pair. */
export function sharedEntity(n: number): { name: string; email: string } {
  const seed = (sessionSeed() + (((n % ENTITY_COUNT) + ENTITY_COUNT) % ENTITY_COUNT) * 0x9e3779b1) >>> 0;
  return { name: pii("name", seed), email: pii("email", seed) };
}
