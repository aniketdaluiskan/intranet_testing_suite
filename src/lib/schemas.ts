import type { ValueKind } from "./pii";
import { appRole } from "./controls";

/**
 * Real business field schemas per app. Captured attributes are these meaningful
 * labels (with type-matched values), not random phrases. Labels repeat across
 * screens/records (like production bloat); values + URLs churn. `schemaFor`
 * falls back to a generic business schema.
 */
export interface Field {
  label: string;
  kind: ValueKind;
  shared?: boolean; // value comes from the cross-app shared pool (case-stitching)
}
export interface Schema {
  fields: Field[];
  sections: string[];
  actions: string[];
}

const f = (label: string, kind: ValueKind): Field => ({ label, kind });

const GENERIC: Schema = {
  fields: [
    f("Reference Number", "code"), f("Name", "name"), f("Owner", "name"),
    f("Department", "department"), f("Status", "status"), f("Priority", "priority"),
    f("Amount", "money"), f("Created Date", "date"), f("Due Date", "date"),
    f("Email", "email"), f("Phone", "phone"), f("Description", "desc"),
    f("Category", "text"), f("Region", "country"), f("Approved", "bool"),
    f("Completion", "percent"), f("Assigned To", "name"), f("Cost Center", "code"),
  ],
  sections: ["Overview", "Records", "Assigned to me", "Reports", "Approvals", "Archive", "Settings"],
  actions: ["Create", "Edit", "Assign", "Approve", "Export", "Comment", "Escalate"],
};

const SCHEMAS: Record<string, Schema> = {
  insurance: {
    fields: [
      f("Claim Number", "code"), f("Policy Number", "code"), f("Policyholder Name", "name"),
      f("Insured Name", "name"), f("Date of Loss", "date"), f("Date Reported", "date"),
      f("Claim Type", "text"), f("Claim Status", "status"), f("Claim Amount", "money"),
      f("Approved Amount", "money"), f("Deductible", "money"), f("Reserve Amount", "money"),
      f("Paid Amount", "money"), f("Adjuster", "name"), f("Coverage Type", "text"),
      f("Cause of Loss", "text"), f("Loss Description", "desc"), f("Claimant Phone", "phone"),
      f("Claimant Email", "email"), f("Incident Location", "address"), f("Fault %", "percent"),
      f("Litigation", "bool"), f("SIU Referral", "bool"), f("Premium", "money"),
      f("Policy Effective Date", "date"), f("Agent", "name"),
    ],
    sections: ["New Claim", "Open Claims", "Pending Review", "Approved", "Denied", "Payments", "Reserves", "Reports"],
    actions: ["Create Claim", "Assign Adjuster", "Approve", "Deny", "Add Payment", "Set Reserve", "Escalate", "Close Claim"],
  },
  payroll: {
    fields: [
      f("Employee ID", "empId"), f("Employee Name", "name"), f("Pay Period", "text"),
      f("Pay Date", "date"), f("Gross Pay", "money"), f("Net Pay", "money"),
      f("Basic Salary", "money"), f("Overtime", "money"), f("Bonus", "money"),
      f("Tax Withheld", "money"), f("Social Security", "money"), f("Medicare", "money"),
      f("Retirement Plan Contribution", "money"), f("Health Insurance", "money"), f("Department", "department"),
      f("Job Title", "text"), f("Hours Worked", "count"), f("PTO Balance", "count"),
      f("Bank Account", "account"), f("Filing Status", "text"), f("YTD Gross", "money"),
      f("YTD Tax", "money"), f("Cost Center", "code"),
    ],
    sections: ["Pay Runs", "Employees", "Tax", "Deductions", "Benefits", "Timesheets", "Bank Files", "Reports"],
    actions: ["Run Payroll", "Approve", "Generate Payslip", "Export Bank File", "Adjust", "File Tax", "Hold", "Release"],
  },
  hrms: {
    fields: [
      f("Employee ID", "empId"), f("Full Name", "name"), f("Job Title", "text"),
      f("Department", "department"), f("Manager", "name"), f("Hire Date", "date"),
      f("Employment Type", "text"), f("Work Location", "city"), f("Email", "email"),
      f("Phone", "phone"), f("Date of Birth", "date"), f("Salary Band", "text"),
      f("Performance Rating", "text"), f("Leave Balance", "count"), f("Status", "status"),
      f("Emergency Contact", "name"), f("Address", "address"),
    ],
    sections: ["Directory", "My Team", "Leave", "Payroll", "Performance", "Recruitment", "Onboarding", "Reports"],
    actions: ["Add Employee", "Approve Leave", "Promote", "Assign", "Offboard", "Export", "Review", "Escalate"],
  },
  crm: {
    fields: [
      f("Account Name", "text"), f("Contact Name", "name"), f("Title", "text"),
      f("Email", "email"), f("Phone", "phone"), f("Lead Source", "text"),
      f("Opportunity", "text"), f("Stage", "text"), f("Amount", "money"),
      f("Close Date", "date"), f("Probability", "percent"), f("Owner", "name"),
      f("Industry", "text"), f("Region", "country"), f("Next Step", "text"),
      f("Last Activity", "date"), f("Annual Revenue", "money"), f("Employees", "count"),
    ],
    sections: ["Leads", "Accounts", "Contacts", "Opportunities", "Pipeline", "Activities", "Forecast", "Reports"],
    actions: ["New Lead", "Convert", "Assign Owner", "Log Call", "Send Email", "Advance Stage", "Close Won", "Close Lost"],
  },
  servicenow: {
    fields: [
      f("Number", "code"), f("Short Description", "text"), f("Priority", "priority"),
      f("Urgency", "text"), f("Impact", "text"), f("State", "status"),
      f("Category", "text"), f("Subcategory", "text"), f("Assigned To", "name"),
      f("Assignment Group", "text"), f("Caller", "name"), f("Opened", "datetime"),
      f("Configuration Item", "text"), f("SLA", "text"), f("Resolution Notes", "desc"),
      f("Closed", "datetime"), f("Reassignment Count", "count"),
    ],
    sections: ["Incidents", "Problems", "Changes", "Requests", "Knowledge", "CMDB", "SLAs", "Reports"],
    actions: ["Create Incident", "Assign", "Escalate", "Resolve", "Close", "Add Comment", "Attach", "Approve"],
  },
  testcase: {
    fields: [
      f("Test Case ID", "code"), f("Title", "text"), f("Module", "text"),
      f("Priority", "priority"), f("Type", "text"), f("Status", "status"),
      f("Preconditions", "desc"), f("Steps", "desc"), f("Expected Result", "desc"),
      f("Actual Result", "desc"), f("Assigned Tester", "name"), f("Execution Date", "date"),
      f("Environment", "text"), f("Build", "code"), f("Defect ID", "code"),
      f("Automated", "bool"),
    ],
    sections: ["Test Suites", "Test Cases", "Test Runs", "Defects", "Requirements", "Cycles", "Reports", "Config"],
    actions: ["Create Test", "Run", "Pass", "Fail", "Block", "Assign", "Log Defect", "Clone"],
  },
  jira: {
    fields: [
      f("Issue Key", "code"), f("Summary", "text"), f("Issue Type", "text"),
      f("Status", "status"), f("Priority", "priority"), f("Assignee", "name"),
      f("Reporter", "name"), f("Story Points", "count"), f("Sprint", "text"),
      f("Epic Link", "text"), f("Labels", "text"), f("Component", "text"),
      f("Created", "date"), f("Due Date", "date"), f("Resolution", "text"),
      f("Time Spent", "count"),
    ],
    sections: ["Backlog", "Active Sprint", "Board", "Roadmap", "Releases", "Components", "Reports", "Issues"],
    actions: ["Create Issue", "Assign", "Transition", "Comment", "Log Work", "Link Issue", "Start Sprint", "Resolve"],
  },
  sharepoint: {
    fields: [
      f("Document Name", "text"), f("Modified", "datetime"), f("Modified By", "name"),
      f("Document Type", "text"), f("Version", "code"), f("Status", "status"),
      f("Owner", "name"), f("Department", "department"), f("Retention", "text"),
      f("Confidentiality", "text"), f("Checked Out To", "name"), f("Size", "count"),
    ],
    sections: ["Home", "Documents", "Shared with me", "Recent", "Site Pages", "Lists", "Recycle Bin", "Settings"],
    actions: ["New", "Upload", "Share", "Sync", "Check Out", "Approve", "Move", "Delete"],
  },
  excel: {
    fields: [
      f("Account", "text"), f("GL Code", "code"), f("Cost Center", "code"),
      f("Amount", "money"), f("Debit", "money"), f("Credit", "money"),
      f("Currency", "text"), f("Period", "text"), f("Vendor", "text"),
      f("Invoice No", "code"), f("Status", "status"), f("Approver", "name"),
      f("Department", "department"), f("Variance %", "percent"),
    ],
    sections: ["Sheet1", "Summary", "Ledger", "Budget", "Forecast", "Pivot", "Charts", "Data"],
    actions: ["Insert", "Sum", "Filter", "Sort", "Format", "Chart", "Refresh", "Export"],
  },
  word: {
    fields: [
      f("Document Title", "text"), f("Author", "name"), f("Department", "department"),
      f("Version", "code"), f("Status", "status"), f("Approved By", "name"),
      f("Effective Date", "date"), f("Review Date", "date"), f("Classification", "text"),
      f("Owner", "name"), f("Reference", "code"),
    ],
    sections: ["Home", "Insert", "Layout", "References", "Review", "View"],
    actions: ["Save", "Share", "Comment", "Track Changes", "Approve", "Export PDF"],
  },
  wiki: {
    fields: [
      f("Page Title", "text"), f("Space", "text"), f("Author", "name"),
      f("Last Updated", "datetime"), f("Version", "code"), f("Status", "status"),
      f("Labels", "text"), f("Owner", "name"), f("Reviewers", "name"),
    ],
    sections: ["Overview", "Spaces", "Recent", "Drafts", "Templates", "People", "Labels", "Settings"],
    actions: ["Create Page", "Edit", "Comment", "Watch", "Move", "Publish", "Restrict"],
  },
  outlook: {
    fields: [
      f("From", "name"), f("To", "email"), f("Subject", "text"),
      f("Received", "datetime"), f("Importance", "priority"), f("Category", "text"),
      f("Has Attachment", "bool"), f("Folder", "text"), f("Flag Status", "status"),
    ],
    sections: ["Inbox", "Sent Items", "Drafts", "Deleted", "Archive", "Junk", "Calendar", "Contacts"],
    actions: ["New Mail", "Reply", "Reply All", "Forward", "Flag", "Move", "Categorize", "Delete"],
  },
  teams: {
    fields: [
      f("Channel", "text"), f("Sender", "name"), f("Message", "desc"),
      f("Posted", "datetime"), f("Mentions", "name"), f("Reactions", "count"),
      f("Meeting", "text"), f("Organizer", "name"), f("Attendees", "count"),
    ],
    sections: ["Activity", "Chat", "Teams", "Calendar", "Calls", "Files", "Apps", "Help"],
    actions: ["New Chat", "Meet Now", "Share", "Mention", "Pin", "React", "Schedule"],
  },
  copilot: {
    fields: [
      f("Topic", "text"), f("Prompt", "desc"), f("Referenced File", "text"),
      f("Owner", "name"), f("Created", "datetime"), f("Confidence", "percent"),
      f("Action Item", "text"), f("Due Date", "date"), f("Assigned To", "name"),
    ],
    sections: ["Chat", "Agents", "History", "Prompts", "Files", "Notebook", "Pages"],
    actions: ["New chat", "Summarize", "Draft", "Analyze", "Insert", "Share"],
  },
  azure: {
    fields: [
      f("Resource Name", "text"), f("Resource Type", "text"), f("Resource Group", "text"),
      f("Subscription", "code"), f("Region", "country"), f("Status", "status"),
      f("SKU", "code"), f("Monthly Cost", "money"), f("Owner", "name"),
      f("Tags", "text"), f("Created", "datetime"), f("Health", "status"),
    ],
    sections: ["Home", "Resource groups", "All resources", "Monitor", "Cost Management", "Subscriptions", "Advisor", "Security"],
    actions: ["Create", "Start", "Stop", "Restart", "Scale", "Delete", "Tag", "Export"],
  },
  git: {
    fields: [
      f("Repository", "text"), f("Branch", "text"), f("Commit", "code"),
      f("Author", "name"), f("Message", "text"), f("Files Changed", "count"),
      f("Additions", "count"), f("Deletions", "count"), f("PR Number", "code"),
      f("Reviewer", "name"), f("Status", "status"), f("Merged", "bool"),
    ],
    sections: ["Code", "Pull requests", "Issues", "Actions", "Branches", "Commits", "Wiki", "Settings"],
    actions: ["Clone", "New PR", "Commit", "Merge", "Review", "Approve", "Revert", "Tag"],
  },
  jenkins: {
    fields: [
      f("Job Name", "text"), f("Build Number", "code"), f("Result", "status"),
      f("Duration", "text"), f("Triggered By", "name"), f("Branch", "text"),
      f("Commit", "code"), f("Node", "text"), f("Stage", "text"),
      f("Tests Passed", "count"), f("Tests Failed", "count"), f("Coverage", "percent"),
    ],
    sections: ["New Item", "People", "Build History", "Manage Jenkins", "My Views", "Credentials"],
    actions: ["Build Now", "Configure", "Rebuild", "Abort", "Replay", "Restart", "Disable"],
  },
  tableau: {
    fields: [
      f("Metric", "text"), f("Value", "count"), f("Dashboard", "text"),
      f("Data Source", "text"), f("Region", "country"), f("Period", "text"),
      f("Target", "money"), f("Actual", "money"), f("Variance %", "percent"),
      f("Owner", "name"), f("Refreshed", "datetime"),
    ],
    sections: ["Home", "Explore", "Favorites", "Dashboards", "Data Sources", "Metrics", "Subscriptions", "Settings"],
    actions: ["New Workbook", "Filter", "Drill Down", "Export", "Subscribe", "Share", "Refresh"],
  },
  monitoring: {
    fields: [
      f("Metric", "text"), f("Value", "count"), f("Threshold", "percent"),
      f("Status", "status"), f("Data Source", "text"), f("Instance", "ipv4"),
      f("Time Range", "text"), f("Owner", "name"), f("Alert Rule", "text"),
      f("Severity", "priority"), f("Last Triggered", "datetime"),
    ],
    sections: ["Dashboards", "Explore", "Alerting", "Data Sources", "Panels", "Silences", "Admin", "Reports"],
    actions: ["New Dashboard", "Add Panel", "Create Alert", "Silence", "Refresh", "Export", "Share"],
  },
  onenote: {
    fields: [
      f("Note Title", "text"), f("Section", "text"), f("Created", "date"),
      f("Author", "name"), f("Tag", "text"), f("To-Do", "bool"),
      f("Due Date", "date"), f("Owner", "name"), f("Reminder", "datetime"),
    ],
    sections: ["Quick Notes", "Meetings", "Projects", "Personal", "Research", "Archive"],
    actions: ["New Page", "New Section", "Tag", "To-Do", "Share", "Search"],
  },
  forms: {
    fields: [
      f("First Name", "firstName"), f("Last Name", "lastName"), f("Email", "email"),
      f("Phone", "phone"), f("Date of Birth", "date"), f("Address", "address"),
      f("Country", "country"), f("Department", "department"), f("Amount", "money"),
      f("Category", "text"), f("Consent", "bool"), f("Comments", "desc"),
      f("Reference", "code"), f("Submitted", "datetime"),
    ],
    sections: ["My Forms", "Templates", "Responses", "Shared", "Drafts", "Archive", "Settings"],
    actions: ["New Form", "Add Field", "Preview", "Submit", "Save Draft", "Share", "Export"],
  },
  powerpoint: {
    fields: [
      f("Slide Title", "text"), f("Presenter", "name"), f("Section", "text"),
      f("Date", "date"), f("Audience", "text"), f("Status", "status"),
      f("Owner", "name"), f("Slide Count", "count"), f("Template", "text"),
    ],
    sections: ["Home", "Insert", "Design", "Transitions", "Review", "View"],
    actions: ["New Slide", "Layout", "Present", "Comment", "Share", "Export"],
  },
};

/**
 * Chrome/UI labels appended to EVERY app. These persist as real `<label for>`
 * attributes, recur across apps and routes, and drive star-suffix explosion
 * (Status, Status*, …). All start uppercase, ASCII, 2–200 chars, and avoid
 * stop-word substrings (header / picture / textbox).
 */
const CHROME_FIELDS: Field[] = [
  f("View", "text"),
  f("Filter", "text"),
  f("Actions", "text"),
  f("Owner", "name"),
  f("Department", "department"),
  f("Status", "status"),
  f("Number", "code"),
  f("State", "text"),
  f("Category", "text"),
  f("Priority", "priority"),
  f("Assigned To", "name"),
  f("Created Date", "date"),
];

/**
 * A common `Id` present in EVERY app. Its value is the SAME across most sub-apps
 * (so case-discovery can stitch events across apps), blank on a fraction of
 * fields, and a DIFFERENT id for the independent "noise" apps.
 * `Id` is a valid uppercase-start label; it becomes field[0] of every app and so
 * recurs heavily across screens.
 */
const COMMON_ID: Field = { label: "Id", kind: "code", shared: true };
export const SHARED_IDS = ["CS-100047", "CS-100048"];

export function commonIdValue(appId: string, i: number): string {
  if (appRole(appId) === "noise") return i % 3 === 0 ? "" : SHARED_IDS[1]; // noise: own id, some blank
  if (i % 7 === 6) return ""; // occasionally blank elsewhere
  return SHARED_IDS[0]; // shared across process + extra apps → stitchable
}

export function schemaFor(appId: string): Schema {
  const base = SCHEMAS[appId] ?? GENERIC;
  return { ...base, fields: [COMMON_ID, ...base.fields, ...CHROME_FIELDS] };
}

