import { appCapacity, type AppCapacity, type BlockKind } from "../lib/attributes";

/**
 * The catalogue of look-alike sub-apps. Each app is a familiar enterprise tool
 * rendered as an original (non-branded) shell. Differences that make them read
 * as distinct products: accent colour, monogram, nav flavour, and which content
 * blocks the layout kind renders. Attribute capacity (valid/invalid) is computed
 * from the block composition and shown on the portal.
 */
export type Kind =
  | "chat"
  | "docs"
  | "records"
  | "analytics"
  | "board"
  | "editor"
  | "mail"
  | "forms"
  | "cloud"
  | "repo"
  | "ci";

export const KIND_BLOCKS: Record<Kind, BlockKind[]> = {
  chat: ["chat"],
  docs: ["cards", "table"],
  records: ["table", "form"],
  analytics: ["dashboard"],
  board: ["kanban", "table"],
  editor: ["doc"],
  mail: ["mail"],
  forms: ["form", "cards"],
  cloud: ["dashboard", "table"],
  repo: ["repo"],
  ci: ["build", "table"],
};

/** Views (sidebar × tab navigations) per app in one full pass. Scaled with
 * BLOCK_CAP so a full pass of all apps totals the capacity target. Every
 * navigation churns labels, so a real browsing session yields well beyond one pass. */
export const KIND_VIEWS: Record<Kind, number> = {
  chat: 100,
  docs: 90,
  records: 120,
  analytics: 80,
  board: 100,
  editor: 70,
  mail: 90,
  forms: 80,
  cloud: 110,
  repo: 90,
  ci: 80,
};

export interface AppDef {
  id: string;
  name: string;
  monogram: string;
  accent: string;
  blurb: string;
  kind: Kind;
}

export const APPS: AppDef[] = [
  { id: "copilot", name: "Copilot", monogram: "CP", accent: "#7b61ff", blurb: "AI chat assistant", kind: "chat" },
  { id: "sharepoint", name: "SharePoint", monogram: "SP", accent: "#0f6cbd", blurb: "Team document sites", kind: "docs" },
  { id: "servicenow", name: "ServiceNow", monogram: "SN", accent: "#1c8a6a", blurb: "IT service management", kind: "records" },
  { id: "tableau", name: "Tableau", monogram: "TB", accent: "#e8762d", blurb: "Analytics dashboards", kind: "analytics" },
  { id: "jira", name: "Jira", monogram: "JR", accent: "#2563eb", blurb: "Issues & sprints", kind: "board" },
  { id: "excel", name: "Excel Online", monogram: "XL", accent: "#217346", blurb: "Spreadsheets", kind: "editor" },
  { id: "word", name: "Word Online", monogram: "WD", accent: "#2b579a", blurb: "Documents", kind: "editor" },
  { id: "powerpoint", name: "PowerPoint Online", monogram: "PP", accent: "#c43e1c", blurb: "Slide decks", kind: "editor" },
  { id: "onenote", name: "OneNote Online", monogram: "ON", accent: "#7719aa", blurb: "Notebooks", kind: "editor" },
  { id: "outlook", name: "Outlook", monogram: "OL", accent: "#0a5bd3", blurb: "Mailbox", kind: "mail" },
  { id: "teams", name: "Teams", monogram: "TM", accent: "#4b53bc", blurb: "Chat & channels", kind: "chat" },
  { id: "forms", name: "Dynamic Forms", monogram: "DF", accent: "#0b8043", blurb: "Configurable forms", kind: "forms" },
  { id: "hrms", name: "HRMS", monogram: "HR", accent: "#b7295a", blurb: "People & payroll", kind: "forms" },
  { id: "testcase", name: "Test Management", monogram: "TC", accent: "#00838f", blurb: "Test cases & runs", kind: "records" },
  { id: "azure", name: "Azure Portal", monogram: "AZ", accent: "#0078d4", blurb: "Cloud resources", kind: "cloud" },
  { id: "git", name: "Repos", monogram: "GT", accent: "#e05a2b", blurb: "Source control", kind: "repo" },
  { id: "jenkins", name: "Jenkins", monogram: "JK", accent: "#335061", blurb: "CI pipelines", kind: "ci" },
  { id: "wiki", name: "Confluence Wiki", monogram: "WK", accent: "#1868db", blurb: "Knowledge base", kind: "editor" },
  { id: "crm", name: "CRM", monogram: "CR", accent: "#0d9488", blurb: "Accounts & leads", kind: "records" },
  { id: "monitoring", name: "Grafana", monogram: "GF", accent: "#f46800", blurb: "Metrics & alerts", kind: "analytics" },
  { id: "payroll", name: "Payroll", monogram: "PY", accent: "#0a7d5a", blurb: "Pay runs & tax", kind: "records" },
  { id: "insurance", name: "Insurance Claims", monogram: "IC", accent: "#6d28d9", blurb: "Claims processing", kind: "records" },
  { id: "slack", name: "Slack", monogram: "Sl", accent: "#611f69", blurb: "Team messaging", kind: "chat" },
  { id: "zoom", name: "Zoom", monogram: "Zm", accent: "#2d63ff", blurb: "Meetings & webinars", kind: "records" },
  { id: "workday", name: "Workday", monogram: "Wy", accent: "#f38b00", blurb: "HR & finance", kind: "forms" },
  { id: "zendesk", name: "Zendesk", monogram: "Zd", accent: "#17494d", blurb: "Support tickets", kind: "records" },
  { id: "powerbi", name: "Power BI", monogram: "PB", accent: "#b8860b", blurb: "Business intelligence", kind: "analytics" },
  { id: "drive", name: "Drive", monogram: "Dv", accent: "#1a73e8", blurb: "Cloud file storage", kind: "docs" },
  { id: "docusign", name: "DocuSign", monogram: "Ds", accent: "#c56a12", blurb: "E-signature envelopes", kind: "forms" },
  { id: "notion", name: "Notion", monogram: "Nt", accent: "#2f3437", blurb: "Docs & wikis", kind: "editor" },
  { id: "bitbucket", name: "Bitbucket", monogram: "Bb", accent: "#2160e6", blurb: "Source control", kind: "repo" },
  { id: "asana", name: "Asana", monogram: "As", accent: "#d6567a", blurb: "Work management", kind: "board" },
  { id: "kibana", name: "Kibana", monogram: "Kb", accent: "#c7285a", blurb: "Log analytics", kind: "analytics" },
  { id: "sap", name: "SAP", monogram: "Sa", accent: "#0a6ed1", blurb: "ERP", kind: "records" },
  { id: "okta", name: "Okta", monogram: "Ok", accent: "#00648f", blurb: "Identity & SSO", kind: "records" },
  { id: "concur", name: "Concur", monogram: "Cn", accent: "#c4551d", blurb: "Expenses & travel", kind: "records" },
  { id: "pagerduty", name: "PagerDuty", monogram: "Pd", accent: "#0a8f3c", blurb: "Incident response", kind: "records" },
  { id: "capturelab", name: "Capture Lab", monogram: "CL", accent: "#0e7490", blurb: "Iframes, Shadow DOM, postMessage & deep DOM", kind: "records" },
];

export function getApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}

export function appBlocks(app: AppDef): BlockKind[] {
  return KIND_BLOCKS[app.kind];
}

export function appViews(app: AppDef): number {
  return KIND_VIEWS[app.kind];
}

export function capacityOf(app: AppDef): AppCapacity {
  return appCapacity(appBlocks(app), appViews(app));
}
