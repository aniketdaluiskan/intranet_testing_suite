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

export type Group =
  | "collab" | "docs" | "itservice" | "devops" | "hr" | "finance"
  | "procure" | "sales" | "analytics" | "risk" | "lending" | "payments"
  | "banking" | "insurance" | "invest";

/** Ordered functional groups rendered as sections on the portal (grouped by FUNCTION only). */
export const GROUPS: { id: Group; label: string }[] = [
  { id: "collab", label: "Communication & Collaboration" },
  { id: "docs", label: "Documents & Content" },
  { id: "itservice", label: "IT Service & Support" },
  { id: "devops", label: "Engineering & DevOps" },
  { id: "hr", label: "HR & Workforce" },
  { id: "finance", label: "Finance & Accounting" },
  { id: "procure", label: "Procurement & Vendors" },
  { id: "sales", label: "Sales, CRM & Marketing" },
  { id: "analytics", label: "Analytics & BI" },
  { id: "risk", label: "Risk, Compliance & Security" },
  { id: "lending", label: "Lending & Credit" },
  { id: "payments", label: "Payments & Cards" },
  { id: "banking", label: "Core Banking & Deposits" },
  { id: "insurance", label: "Insurance Operations" },
  { id: "invest", label: "Investments & Trading" },
];

export interface AppDef {
  id: string;
  name: string;
  monogram: string;
  accent: string;
  blurb: string;
  kind: Kind;
  group: Group;
}

export const APPS: AppDef[] = [
  // ── Communication & Collaboration ──
  { id: "copilot", name: "Copilot", monogram: "CP", accent: "#7b61ff", blurb: "AI chat assistant", kind: "chat", group: "collab" },
  { id: "outlook", name: "Outlook", monogram: "OL", accent: "#0a5bd3", blurb: "Mailbox", kind: "mail", group: "collab" },
  { id: "teams", name: "Teams", monogram: "TM", accent: "#4b53bc", blurb: "Chat & channels", kind: "chat", group: "collab" },
  { id: "slack", name: "Slack", monogram: "Sl", accent: "#611f69", blurb: "Team messaging", kind: "chat", group: "collab" },
  { id: "zoom", name: "Zoom", monogram: "Zm", accent: "#2d63ff", blurb: "Meetings & webinars", kind: "records", group: "collab" },
  { id: "calendar", name: "Calendar", monogram: "Ca", accent: "#2563eb", blurb: "Scheduling & rooms", kind: "records", group: "collab" },
  // ── Documents & Content ──
  { id: "sharepoint", name: "SharePoint", monogram: "SP", accent: "#0f6cbd", blurb: "Team document sites", kind: "docs", group: "docs" },
  { id: "drive", name: "Drive", monogram: "Dv", accent: "#1a73e8", blurb: "Cloud file storage", kind: "docs", group: "docs" },
  { id: "word", name: "Word Online", monogram: "WD", accent: "#2b579a", blurb: "Documents", kind: "editor", group: "docs" },
  { id: "excel", name: "Excel Online", monogram: "XL", accent: "#217346", blurb: "Spreadsheets", kind: "editor", group: "docs" },
  { id: "powerpoint", name: "PowerPoint Online", monogram: "PP", accent: "#c43e1c", blurb: "Slide decks", kind: "editor", group: "docs" },
  { id: "onenote", name: "OneNote Online", monogram: "ON", accent: "#7719aa", blurb: "Notebooks", kind: "editor", group: "docs" },
  { id: "notion", name: "Notion", monogram: "Nt", accent: "#2f3437", blurb: "Docs & wikis", kind: "editor", group: "docs" },
  { id: "wiki", name: "Confluence Wiki", monogram: "WK", accent: "#1868db", blurb: "Knowledge base", kind: "editor", group: "docs" },
  { id: "forms", name: "Dynamic Forms", monogram: "DF", accent: "#0b8043", blurb: "Configurable forms", kind: "forms", group: "docs" },
  { id: "docusign", name: "DocuSign", monogram: "Ds", accent: "#c56a12", blurb: "E-signature envelopes", kind: "forms", group: "docs" },
  // ── IT Service & Support ──
  { id: "servicenow", name: "ServiceNow", monogram: "SN", accent: "#1c8a6a", blurb: "IT service management", kind: "records", group: "itservice" },
  { id: "zendesk", name: "Zendesk", monogram: "Zd", accent: "#17494d", blurb: "Support tickets", kind: "records", group: "itservice" },
  { id: "assets", name: "Asset Manager", monogram: "AM", accent: "#2a7ade", blurb: "IT assets & CMDB", kind: "records", group: "itservice" },
  { id: "knowledge", name: "Knowledge Base", monogram: "KB", accent: "#0e8a6a", blurb: "Support articles", kind: "editor", group: "itservice" },
  { id: "endpoint", name: "Endpoint Manager", monogram: "EP", accent: "#3b6fb5", blurb: "Devices & policies", kind: "records", group: "itservice" },
  // ── Engineering & DevOps ──
  { id: "jira", name: "Jira", monogram: "JR", accent: "#2563eb", blurb: "Issues & sprints", kind: "board", group: "devops" },
  { id: "asana", name: "Asana", monogram: "As", accent: "#d6567a", blurb: "Work management", kind: "board", group: "devops" },
  { id: "azure", name: "Azure Portal", monogram: "AZ", accent: "#0078d4", blurb: "Cloud resources", kind: "cloud", group: "devops" },
  { id: "git", name: "Repos", monogram: "GT", accent: "#e05a2b", blurb: "Source control", kind: "repo", group: "devops" },
  { id: "bitbucket", name: "Bitbucket", monogram: "Bb", accent: "#2160e6", blurb: "Source control", kind: "repo", group: "devops" },
  { id: "jenkins", name: "Jenkins", monogram: "JK", accent: "#335061", blurb: "CI pipelines", kind: "ci", group: "devops" },
  { id: "artifacts", name: "Artifact Registry", monogram: "AR", accent: "#3b7c47", blurb: "Build artifacts", kind: "repo", group: "devops" },
  { id: "terraform", name: "Infra as Code", monogram: "IF", accent: "#7b42bc", blurb: "Cloud provisioning", kind: "cloud", group: "devops" },
  { id: "sonar", name: "Code Quality", monogram: "CQ", accent: "#4c9bd6", blurb: "Static analysis", kind: "analytics", group: "devops" },
  { id: "testcase", name: "Test Management", monogram: "TC", accent: "#00838f", blurb: "Test cases & runs", kind: "records", group: "devops" },
  { id: "monitoring", name: "Grafana", monogram: "GF", accent: "#f46800", blurb: "Metrics & alerts", kind: "analytics", group: "devops" },
  { id: "kibana", name: "Kibana", monogram: "Kb", accent: "#c7285a", blurb: "Log analytics", kind: "analytics", group: "devops" },
  { id: "pagerduty", name: "PagerDuty", monogram: "Pd", accent: "#0a8f3c", blurb: "Incident response", kind: "records", group: "devops" },
  { id: "capturelab", name: "Capture Lab", monogram: "CL", accent: "#0e7490", blurb: "Iframes, Shadow DOM, postMessage & deep DOM", kind: "records", group: "devops" },
  // ── HR & Workforce ──
  { id: "workday", name: "Workday", monogram: "Wy", accent: "#f38b00", blurb: "HR & finance", kind: "forms", group: "hr" },
  { id: "hrms", name: "HRMS", monogram: "HR", accent: "#b7295a", blurb: "People & records", kind: "forms", group: "hr" },
  { id: "payroll", name: "Payroll", monogram: "PY", accent: "#0a7d5a", blurb: "Pay runs & tax", kind: "records", group: "hr" },
  { id: "concur", name: "Concur", monogram: "Cn", accent: "#c4551d", blurb: "Expenses & travel", kind: "records", group: "hr" },
  { id: "recruiting", name: "Recruiting", monogram: "RC", accent: "#d64d7a", blurb: "Applicant tracking", kind: "records", group: "hr" },
  { id: "lms", name: "Learning", monogram: "LN", accent: "#c2410c", blurb: "Courses & training", kind: "records", group: "hr" },
  { id: "benefits", name: "Benefits", monogram: "BN", accent: "#0891b2", blurb: "Benefits enrollment", kind: "forms", group: "hr" },
  { id: "timesheet", name: "Time & Attendance", monogram: "TA", accent: "#7c3aed", blurb: "Timesheets & leave", kind: "forms", group: "hr" },
  { id: "performance", name: "Performance", monogram: "PF", accent: "#be185d", blurb: "Reviews & goals", kind: "forms", group: "hr" },
  // ── Finance & Accounting ──
  { id: "sap", name: "SAP", monogram: "Sa", accent: "#0a6ed1", blurb: "ERP", kind: "records", group: "finance" },
  { id: "gl", name: "General Ledger", monogram: "GL", accent: "#1e6fd1", blurb: "Journals & ledger", kind: "records", group: "finance" },
  { id: "ap", name: "Accounts Payable", monogram: "AP", accent: "#1e6f5c", blurb: "Vendor invoices", kind: "records", group: "finance" },
  { id: "ar", name: "Accounts Receivable", monogram: "AC", accent: "#2f5fd6", blurb: "Customer billing", kind: "records", group: "finance" },
  { id: "treasury", name: "Treasury", monogram: "TR", accent: "#0f766e", blurb: "Cash & liquidity", kind: "records", group: "finance" },
  { id: "fpna", name: "FP&A", monogram: "FA", accent: "#b45309", blurb: "Planning & forecast", kind: "analytics", group: "finance" },
  { id: "fixedassets", name: "Fixed Assets", monogram: "FX", accent: "#4d7c0f", blurb: "Asset depreciation", kind: "records", group: "finance" },
  { id: "close", name: "Financial Close", monogram: "FC", accent: "#5b21b6", blurb: "Period close tasks", kind: "board", group: "finance" },
  // ── Procurement & Vendors ──
  { id: "procurement", name: "Procurement", monogram: "PR", accent: "#0d9488", blurb: "Purchase orders", kind: "records", group: "procure" },
  { id: "vendors", name: "Vendor Management", monogram: "VM", accent: "#c026d3", blurb: "Supplier records", kind: "records", group: "procure" },
  { id: "contracts", name: "Contracts", monogram: "CT", accent: "#0369a1", blurb: "Contract lifecycle", kind: "records", group: "procure" },
  { id: "sourcing", name: "Sourcing", monogram: "SO", accent: "#a16207", blurb: "RFx & bids", kind: "forms", group: "procure" },
  // ── Sales, CRM & Marketing ──
  { id: "crm", name: "CRM", monogram: "CR", accent: "#0d9488", blurb: "Accounts & leads", kind: "records", group: "sales" },
  { id: "marketing", name: "Marketing", monogram: "MK", accent: "#db2777", blurb: "Campaigns", kind: "analytics", group: "sales" },
  { id: "cpq", name: "Quotes (CPQ)", monogram: "QT", accent: "#0e7490", blurb: "Configure & quote", kind: "forms", group: "sales" },
  { id: "contactcenter", name: "Contact Center", monogram: "CC", accent: "#4338ca", blurb: "Customer service", kind: "records", group: "sales" },
  // ── Analytics & BI ──
  { id: "tableau", name: "Tableau", monogram: "TB", accent: "#e8762d", blurb: "Analytics dashboards", kind: "analytics", group: "analytics" },
  { id: "powerbi", name: "Power BI", monogram: "PB", accent: "#b8860b", blurb: "Business intelligence", kind: "analytics", group: "analytics" },
  { id: "datawarehouse", name: "Data Warehouse", monogram: "DW", accent: "#0e8aa0", blurb: "Enterprise data", kind: "analytics", group: "analytics" },
  { id: "datacatalog", name: "Data Catalog", monogram: "DC", accent: "#3f6212", blurb: "Data governance", kind: "records", group: "analytics" },
  // ── Risk, Compliance & Security ──
  { id: "okta", name: "Okta", monogram: "Ok", accent: "#00648f", blurb: "Identity & SSO", kind: "records", group: "risk" },
  { id: "grc", name: "GRC", monogram: "GR", accent: "#9333ea", blurb: "Governance & risk", kind: "records", group: "risk" },
  { id: "aml", name: "AML Monitoring", monogram: "ML", accent: "#b91c1c", blurb: "Transaction monitoring", kind: "records", group: "risk" },
  { id: "kyc", name: "KYC / CDD", monogram: "KY", accent: "#0f766e", blurb: "Customer due diligence", kind: "forms", group: "risk" },
  { id: "fraud", name: "Fraud Detection", monogram: "FD", accent: "#dc2626", blurb: "Fraud alerts", kind: "records", group: "risk" },
  { id: "audit", name: "Internal Audit", monogram: "IA", accent: "#7c2d12", blurb: "Audit engagements", kind: "records", group: "risk" },
  { id: "siem", name: "Security Ops", monogram: "SC", accent: "#1e40af", blurb: "SIEM & threats", kind: "analytics", group: "risk" },
  { id: "casemgmt", name: "Case Management", monogram: "CM", accent: "#4d7c0f", blurb: "Investigations", kind: "records", group: "risk" },
  { id: "sanctions", name: "Sanctions Screening", monogram: "SS", accent: "#9f1239", blurb: "Watchlist screening", kind: "records", group: "risk" },
  // ── Lending & Credit ──
  { id: "loanorig", name: "Loan Origination", monogram: "LO", accent: "#15803d", blurb: "Loan applications", kind: "forms", group: "lending" },
  { id: "creditdecision", name: "Credit Decisioning", monogram: "CD", accent: "#0e7490", blurb: "Credit scoring", kind: "records", group: "lending" },
  { id: "collections", name: "Collections", monogram: "CO", accent: "#b45309", blurb: "Delinquency & recovery", kind: "records", group: "lending" },
  { id: "mortgage", name: "Mortgage Servicing", monogram: "MG", accent: "#166534", blurb: "Mortgage accounts", kind: "records", group: "lending" },
  // ── Payments & Cards ──
  { id: "payments", name: "Payments Hub", monogram: "PH", accent: "#1d4ed8", blurb: "Payment processing", kind: "records", group: "payments" },
  { id: "wire", name: "Wire Transfers", monogram: "WT", accent: "#0f766e", blurb: "Wires & SWIFT", kind: "forms", group: "payments" },
  { id: "cards", name: "Card Management", monogram: "CA", accent: "#7c3aed", blurb: "Debit & credit cards", kind: "records", group: "payments" },
  { id: "disputes", name: "Disputes", monogram: "DP", accent: "#be123c", blurb: "Chargebacks & disputes", kind: "records", group: "payments" },
  // ── Core Banking & Deposits ──
  { id: "corebank", name: "Core Banking", monogram: "CB", accent: "#0369a1", blurb: "Accounts & ledger", kind: "records", group: "banking" },
  { id: "teller", name: "Teller", monogram: "TL", accent: "#047857", blurb: "Branch transactions", kind: "forms", group: "banking" },
  { id: "accounts", name: "Account Servicing", monogram: "AS", accent: "#1e6f8e", blurb: "Customer accounts", kind: "records", group: "banking" },
  { id: "deposits", name: "Deposits & CDs", monogram: "DE", accent: "#0d5c63", blurb: "Deposits & terms", kind: "records", group: "banking" },
  // ── Insurance Operations ──
  { id: "insurance", name: "Insurance Claims", monogram: "IC", accent: "#6d28d9", blurb: "Claims processing", kind: "records", group: "insurance" },
  { id: "policyadmin", name: "Policy Admin", monogram: "PA", accent: "#7c3aed", blurb: "Policy lifecycle", kind: "records", group: "insurance" },
  { id: "underwriting", name: "Underwriting", monogram: "UW", accent: "#7e22ce", blurb: "Risk assessment", kind: "forms", group: "insurance" },
  { id: "insbilling", name: "Insurance Billing", monogram: "IB", accent: "#9333ea", blurb: "Premium billing", kind: "records", group: "insurance" },
  { id: "agentportal", name: "Agent Portal", monogram: "AG", accent: "#8b2fd6", blurb: "Brokers & agents", kind: "records", group: "insurance" },
  // ── Investments & Trading ──
  { id: "oms", name: "Order Management", monogram: "OM", accent: "#0f766e", blurb: "Trade orders", kind: "records", group: "invest" },
  { id: "portfolio", name: "Portfolio Mgmt", monogram: "PM", accent: "#1d4ed8", blurb: "Holdings & performance", kind: "analytics", group: "invest" },
  { id: "research", name: "Research", monogram: "RS", accent: "#334155", blurb: "Investment research", kind: "editor", group: "invest" },
  { id: "marketdata", name: "Market Data", monogram: "MD", accent: "#a16207", blurb: "Quotes & feeds", kind: "analytics", group: "invest" },
  { id: "wealth", name: "Wealth Portal", monogram: "WP", accent: "#0e7490", blurb: "Client wealth", kind: "records", group: "invest" },
  { id: "custody", name: "Custody", monogram: "CY", accent: "#155e75", blurb: "Settlement & custody", kind: "records", group: "invest" },
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
