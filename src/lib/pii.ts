/**
 * Synthetic PII generators. All values are randomly generated from a seed — they
 * are NOT real people's data. Deterministic per seed so a render is stable, but
 * the seed advances with the churn tick so values keep changing as you interact.
 */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery",
  "Quinn", "Reese", "Harper", "Rowan", "Sydney", "Devon", "Elliot", "Marlowe",
  "Priya", "Arjun", "Mei", "Diego", "Fatima", "Noah", "Ivy", "Leah",
];
const LAST = [
  "Carter", "Bennett", "Fletcher", "Osborne", "Whitfield", "Ramsey", "Delgado",
  "Nakamura", "Okonkwo", "Vasquez", "Lindqvist", "Petrov", "Haddad", "Moreau",
  "Sinclair", "Ashford", "Barlow", "Cromwell", "Ellison", "Fairbanks",
];
const STREETS = [
  "Maple", "Cedar", "Birch", "Sycamore", "Hawthorn", "Ridgeway", "Kingsbury",
  "Ashcroft", "Montrose", "Pemberton", "Larchmont", "Fairview",
];
const CITIES = [
  "Fairhaven", "Brookline", "Westgate", "Ashland", "Rivermont", "Kingsport",
  "Northwood", "Elmhurst", "Glenwood", "Cedarburg",
];
const STATES = ["CA", "NY", "TX", "WA", "IL", "MA", "CO", "GA", "NC", "OH"];
const DOMAINS = ["acme.example", "contoso.example", "northwind.example", "fabrikam.example"];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function digits(rng: () => number, n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(rng() * 10);
  return s;
}

export type PIIKind =
  | "name"
  | "email"
  | "phone"
  | "ssn"
  | "empId"
  | "amount"
  | "date"
  | "address"
  | "ip"
  | "account";

export function pii(kind: PIIKind, seed: number): string {
  const rng = mulberry32(seed >>> 0);
  const first = pick(rng, FIRST);
  const last = pick(rng, LAST);
  switch (kind) {
    case "name":
      return `${first} ${last}`;
    case "email":
      return `${first.toLowerCase()}.${last.toLowerCase()}@${pick(rng, DOMAINS)}`;
    case "phone":
      return `+1-${digits(rng, 3)}-${digits(rng, 3)}-${digits(rng, 4)}`;
    case "ssn":
      return `${digits(rng, 3)}-${digits(rng, 2)}-${digits(rng, 4)}`;
    case "empId":
      return `EMP-${digits(rng, 6)}`;
    case "amount":
      return `$${(Math.floor(rng() * 900000) + 1000).toLocaleString("en-US")}.${digits(rng, 2)}`;
    case "date": {
      const y = 2020 + Math.floor(rng() * 6);
      const mo = String(1 + Math.floor(rng() * 12)).padStart(2, "0");
      const d = String(1 + Math.floor(rng() * 28)).padStart(2, "0");
      return `${y}-${mo}-${d}`;
    }
    case "address":
      return `${digits(rng, 3)} ${pick(rng, STREETS)} St, ${pick(rng, CITIES)}, ${pick(rng, STATES)} ${digits(rng, 5)}`;
    case "ip":
      return `${1 + Math.floor(rng() * 254)}.${Math.floor(rng() * 256)}.${Math.floor(rng() * 256)}.${1 + Math.floor(rng() * 254)}`;
    case "account":
      return `ACCT-${digits(rng, 4)}-${digits(rng, 4)}-${digits(rng, 4)}`;
  }
}

/** Rotates through the PII kinds so a table/form shows a realistic mix. */
export const PII_KINDS: PIIKind[] = [
  "name", "email", "phone", "ssn", "empId", "amount", "date", "address", "ip", "account",
];

export function piiByIndex(i: number, seed: number): string {
  return pii(PII_KINDS[((i % PII_KINDS.length) + PII_KINDS.length) % PII_KINDS.length], seed);
}

/* ── typed business values (so a field's value matches its meaning) ── */
const STATUSES = [
  "Open", "In Progress", "On Hold", "Pending Review", "Resolved", "Closed", "Approved", "Rejected", "Draft", "Submitted",
];
const PRIORITIES = ["Critical", "High", "Moderate", "Low"];
const DEPARTMENTS = [
  "Finance", "Operations", "Compliance", "Human Resources", "IT", "Legal", "Procurement", "Treasury", "Risk", "Sales", "Marketing", "Underwriting", "Claims", "Actuarial",
];
const COUNTRIES = ["USA", "United Kingdom", "Germany", "India", "Canada", "Australia", "Singapore", "Japan", "Brazil", "France"];
const YESNO = ["Yes", "No"];
const NOUNS2 = ["Onboarding", "Reconciliation", "Assessment", "Review", "Approval", "Renewal", "Settlement", "Adjustment", "Audit", "Migration", "Remediation", "Escalation"];
const QUALS2 = ["Quarterly", "Vendor", "Regional", "Corporate", "Annual", "Customer", "Policy", "Claim", "Payroll", "Compliance", "Risk", "Account"];

export type ValueKind =
  | "name" | "firstName" | "lastName" | "email" | "phone" | "ssn" | "empId"
  | "money" | "percent" | "count" | "status" | "priority" | "department"
  | "country" | "city" | "state" | "address" | "bool" | "code" | "id"
  | "date" | "datetime" | "ipv4" | "account" | "text" | "desc";

export function genValue(kind: ValueKind, seed: number): string {
  const rng = mulberry32(seed >>> 0);
  switch (kind) {
    case "money":
      return `$${(Math.floor(rng() * 90000) + 500).toLocaleString("en-US")}.${digits(rng, 2)}`;
    case "percent":
      return `${Math.floor(rng() * 100)}%`;
    case "count":
      return String(Math.floor(rng() * 500));
    case "status":
      return pick(rng, STATUSES);
    case "priority":
      return pick(rng, PRIORITIES);
    case "department":
      return pick(rng, DEPARTMENTS);
    case "country":
      return pick(rng, COUNTRIES);
    case "bool":
      return pick(rng, YESNO);
    case "code":
      return `${String.fromCharCode(65 + Math.floor(rng() * 26))}${String.fromCharCode(65 + Math.floor(rng() * 26))}${String.fromCharCode(65 + Math.floor(rng() * 26))}-${digits(rng, 5)}`;
    case "id":
      return digits(rng, 7);
    case "datetime":
      return `${pii("date", seed)} ${String(Math.floor(rng() * 24)).padStart(2, "0")}:${String(Math.floor(rng() * 60)).padStart(2, "0")}`;
    case "firstName":
      return pick(rng, FIRST);
    case "lastName":
      return pick(rng, LAST);
    case "city":
      return pick(rng, CITIES);
    case "state":
      return pick(rng, STATES);
    case "ipv4":
      return pii("ip", seed);
    case "text":
      return `${pick(rng, QUALS2)} ${pick(rng, NOUNS2)}`;
    case "desc":
      return `${pick(rng, QUALS2)} ${pick(rng, NOUNS2)} for ${pick(rng, FIRST)} ${pick(rng, LAST)} — ${pick(rng, STATUSES)}.`;
    case "name":
    case "email":
    case "phone":
    case "ssn":
    case "empId":
    case "date":
    case "address":
    case "account":
      return pii(kind, seed);
    default:
      return pii("name", seed);
  }
}

/* ── which W3C control a field renders as, + its option list ── */
export type Control =
  | "text" | "number" | "email" | "tel" | "date" | "select" | "radio" | "checkbox" | "textarea";

export function controlFor(kind: ValueKind): Control {
  switch (kind) {
    case "date":
    case "datetime":
      return "date";
    case "money":
    case "count":
    case "percent":
      return "number";
    case "email":
      return "email";
    case "phone":
      return "tel";
    case "bool":
      return "checkbox";
    case "priority":
      return "radio";
    case "status":
    case "department":
    case "country":
      return "select";
    case "desc":
      return "textarea";
    default:
      return "text";
  }
}

export function optionsFor(kind: ValueKind): string[] | null {
  switch (kind) {
    case "status":
      return STATUSES;
    case "priority":
      return PRIORITIES;
    case "department":
      return DEPARTMENTS;
    case "country":
      return COUNTRIES;
    case "bool":
      return YESNO;
    default:
      return null;
  }
}

