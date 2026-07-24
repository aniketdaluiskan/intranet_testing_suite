/**
 * Pools of real English words used to compose UI labels. Labels are built by a
 * bijective mixed-radix index (see labeler.ts) so every generated label is a
 * valid English phrase AND unique within a render — satisfying "no field or
 * button should have the same name" while keeping the words valid.
 */

// Leading qualifier: adjectives + business domains.
export const QUALIFIERS: string[] = [
  "Quarterly", "Regional", "Global", "Pending", "Priority", "Confidential",
  "Consolidated", "Preliminary", "Annual", "Monthly", "Internal", "External",
  "Strategic", "Operational", "Critical", "Standard", "Archived", "Active",
  "Primary", "Secondary", "Legacy", "Provisional", "Approved", "Draft",
  "Finance", "Compliance", "Operations", "Procurement", "Payroll", "Treasury",
  "Marketing", "Engineering", "Security", "Legal", "Facilities", "Logistics",
  "Quality", "Governance", "Corporate", "Divisional", "Enterprise", "Vendor",
  "Customer", "Employee", "Regulatory", "Financial", "Technical", "Commercial",
];

// Core business object nouns.
export const NOUNS: string[] = [
  "Invoice", "Ledger", "Vendor", "Contract", "Incident", "Request", "Ticket",
  "Report", "Dashboard", "Policy", "Control", "Risk", "Asset", "Account",
  "Payment", "Order", "Shipment", "Employee", "Candidate", "Campaign",
  "Milestone", "Backlog", "Sprint", "Pipeline", "Cluster", "Namespace",
  "Repository", "Commit", "Build", "Release", "Workbook", "Notebook",
  "Mailbox", "Channel", "Roster", "Workflow", "Approval", "Attribute",
  "Segment", "Cohort", "Reconciliation", "Adjustment", "Allocation",
  "Forecast", "Budget", "Statement", "Disbursement", "Requisition",
  "Onboarding", "Assessment", "Audit", "Exception", "Escalation", "Remediation",
];

// Trailing artifact / view suffix.
export const SUFFIXES: string[] = [
  "Register", "Queue", "Summary", "Detail", "Overview", "Form", "List",
  "Record", "Log", "Tracker", "Matrix", "Snapshot", "Draft", "Archive",
  "Backlog", "Board", "Panel", "Console", "Workspace", "Inbox", "Digest",
  "Schedule", "Roster", "Manifest", "Index", "Catalog", "Directory", "Profile",
  "Ledger", "Statement",
];

// Action verbs for buttons.
export const VERBS: string[] = [
  "Approve", "Review", "Submit", "Escalate", "Reconcile", "Validate", "Archive",
  "Assign", "Audit", "Publish", "Draft", "Reject", "Merge", "Deploy",
  "Configure", "Monitor", "Export", "Import", "Schedule", "Delegate",
  "Finalize", "Initiate", "Suspend", "Resume", "Terminate", "Onboard",
  "Allocate", "Forecast", "Remediate", "Acknowledge", "Duplicate", "Reassign",
  "Snapshot", "Refresh", "Synchronize", "Annotate", "Categorize", "Prioritize",
];

// Short single-word tags (used in chat-style multi-tag labels).
export const TAGS: string[] = [
  "New", "All", "Open", "Draft", "Mine", "Team", "Recent", "Starred", "Shared",
  "Flagged", "Urgent", "Later", "Done", "Blocked", "Review", "Ready", "Pinned",
];
