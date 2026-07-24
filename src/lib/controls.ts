/**
 * Grounded in a typical label-validation contract for DOM capture:
 *
 *  VALID attribute  = a label→value pair that passes validation:
 *      length 2–55, label≠value, sourced from screen text / widget path / title / url,
 *      label not in the generic button stop-list, no runs of 2+ digits, matches the
 *      allowed label pattern, an accepted control type, not a heading/button tag, and
 *      the name resolves to a real text input.
 *
 *  INVALID attribute = the main bloat driver: a non-value control (button, menu,
 *      tab, header, <strong>, <th>) whose text gets harvested as a label and
 *      defaults to a control type that is NOT ignored, so it survives with a fresh
 *      context per screen — the "same View seen many times" pattern.
 */

/**
 * Control words that (a) pass label-text validity — none are generic button words
 * ['add','submit','close','delete','insert','cancel','ok','no','yes','on','in','off','edit','update'],
 * contain no digits, start with a capital — yet (b) label non-value controls, so
 * they SHOULD be dropped on control-type but bloat when misidentified.
 * Deliberately a SMALL fixed set so the same name recurs across screens/apps.
 */
export const CONTROL_WORDS: string[] = [
  "View",
  "Details",
  "More",
  "Options",
  "Actions",
  "Filter",
  "Sort",
  "Export",
  "Refresh",
  "Preview",
  "Expand",
  "Collapse",
  "Settings",
  "Tools",
  "History",
  "Download",
];

/**
 * Shared semantic attribute vocabulary for the cross-application process test.
 * The SAME concept recurs across the process apps (different screens/URLs →
 * different context) so grouping of semantically-equivalent attributes
 * (e.g. "Loan Number" ≡ "Customer Identifier") is exercised. All pass label
 * validity (capitalised, 2–55 chars, no 2+ digits, not button names).
 */
export const SEMANTIC_ATTRS: string[] = [
  "Loan Number",
  "Customer Identifier",
  "Case Reference",
  "Account Number",
  "Borrower Name",
  "Policy Number",
  "Claim Reference",
  "Application Identifier",
  "Branch Code",
  "Product Category",
];

/** Apps that form the one connected business process (share SEMANTIC_ATTRS). */
export const PROCESS_APPS = [
  "servicenow",
  "jira",
  "sharepoint",
  "crm",
  "hrms",
  "outlook",
  "excel",
  "payroll",
  "insurance",
];

/** Independent "noise" apps (their own taxonomy, no shared vocabulary). */
export const NOISE_APPS = ["tableau", "monitoring", "jenkins"];

export function appRole(appId: string): "process" | "noise" | "extra" {
  if (PROCESS_APPS.includes(appId)) return "process";
  if (NOISE_APPS.includes(appId)) return "noise";
  return "extra";
}
