import type { ValueKind } from "./pii";
import { appRole } from "./controls";
import { getSessionId } from "../session";

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
  slack: {
    fields: [
      f("Channel", "text"), f("Sender", "name"), f("Message", "desc"),
      f("Posted", "datetime"), f("Thread Replies", "count"), f("Reactions", "count"),
      f("Pinned", "bool"), f("Workspace", "text"), f("Mentions", "name"),
    ],
    sections: ["Threads", "Mentions & reactions", "Drafts", "Saved items", "Channels", "Direct messages", "Huddles", "Apps"],
    actions: ["New message", "Create channel", "Invite people", "Start huddle", "Pin", "React", "Reply in thread"],
  },
  zoom: {
    fields: [
      f("Meeting Topic", "text"), f("Meeting ID", "code"), f("Host", "name"),
      f("Start Time", "datetime"), f("Duration", "count"), f("Passcode", "code"),
      f("Waiting Room", "bool"), f("Record Automatically", "bool"), f("Participants", "count"),
      f("Recurring", "bool"), f("Organizer Email", "email"),
    ],
    sections: ["Upcoming", "Previous", "Personal Room", "Recordings", "Webinars", "Contacts", "Whiteboards", "Settings"],
    actions: ["Schedule", "Start", "Join", "Invite", "Record", "Share Screen", "End"],
  },
  workday: {
    fields: [
      f("Worker ID", "empId"), f("Worker Name", "name"), f("Position", "text"),
      f("Department", "department"), f("Manager", "name"), f("Hire Date", "date"),
      f("Compensation", "money"), f("Location", "city"), f("Cost Center", "code"),
      f("Time Off Balance", "count"), f("Business Title", "text"), f("Employment Status", "status"),
    ],
    sections: ["Home", "My Team", "Time Off", "Pay", "Benefits", "Talent", "Recruiting", "Expenses"],
    actions: ["Request Time Off", "Approve", "Change Job", "Add Worker", "Run Report", "Delegate"],
  },
  zendesk: {
    fields: [
      f("Ticket ID", "code"), f("Subject", "text"), f("Requester", "name"),
      f("Requester Email", "email"), f("Priority", "priority"), f("Status", "status"),
      f("Assignee", "name"), f("Group", "text"), f("Channel", "text"),
      f("Tags", "text"), f("Satisfaction", "text"), f("First Response", "datetime"),
    ],
    sections: ["Views", "Your unsolved tickets", "Unassigned", "Recently updated", "Suspended", "Knowledge base", "Explore", "Admin"],
    actions: ["New ticket", "Assign", "Solve", "Escalate", "Add note", "Merge", "Macro"],
  },
  powerbi: {
    fields: [
      f("Report Name", "text"), f("Workspace", "text"), f("Dataset", "text"),
      f("Measure", "text"), f("Value", "money"), f("Target", "money"),
      f("Variance %", "percent"), f("Region", "country"), f("Owner", "name"),
      f("Last Refresh", "datetime"), f("Sensitivity", "text"),
    ],
    sections: ["Home", "Workspaces", "Reports", "Dashboards", "Datasets", "Dataflows", "Scorecards", "Apps"],
    actions: ["New Report", "Refresh", "Publish", "Subscribe", "Export", "Share", "Pin to Dashboard"],
  },
  drive: {
    fields: [
      f("File Name", "text"), f("Owner", "name"), f("Last Modified", "datetime"),
      f("File Type", "text"), f("Size", "count"), f("Shared With", "name"),
      f("Location", "text"), f("Starred", "bool"), f("Version", "code"),
    ],
    sections: ["My Drive", "Shared with me", "Recent", "Starred", "Shared drives", "Spam", "Trash", "Storage"],
    actions: ["New", "Upload", "Share", "Move", "Rename", "Download", "Delete"],
  },
  docusign: {
    fields: [
      f("Envelope ID", "code"), f("Document Name", "text"), f("Sender", "name"),
      f("Recipient", "name"), f("Recipient Email", "email"), f("Envelope Status", "status"),
      f("Sent Date", "date"), f("Completed Date", "date"), f("Signing Order", "count"),
      f("Requires Signature", "bool"), f("Consent Given", "bool"),
    ],
    sections: ["Inbox", "Sent", "Drafts", "Action Required", "Waiting for Others", "Completed", "Templates", "Reports"],
    actions: ["New Envelope", "Sign", "Send", "Void", "Correct", "Remind", "Download"],
  },
  notion: {
    fields: [
      f("Page Title", "text"), f("Workspace", "text"), f("Author", "name"),
      f("Last Edited", "datetime"), f("Status", "status"), f("Assignee", "name"),
      f("Tags", "text"), f("Priority", "priority"), f("Due Date", "date"),
    ],
    sections: ["Getting Started", "Teamspaces", "Shared", "Private", "Templates", "Trash", "Settings"],
    actions: ["New Page", "New Database", "Share", "Comment", "Duplicate", "Move to", "Export"],
  },
  bitbucket: {
    fields: [
      f("Repository", "text"), f("Branch", "text"), f("Commit", "code"),
      f("Author", "name"), f("Message", "text"), f("Pull Request", "code"),
      f("Reviewer", "name"), f("Build Status", "status"), f("Files Changed", "count"),
      f("Merged", "bool"),
    ],
    sections: ["Source", "Commits", "Branches", "Pull requests", "Pipelines", "Deployments", "Downloads", "Settings"],
    actions: ["Clone", "Create branch", "Create PR", "Merge", "Approve", "Decline", "Tag"],
  },
  asana: {
    fields: [
      f("Task Name", "text"), f("Assignee", "name"), f("Due Date", "date"),
      f("Project", "text"), f("Section", "text"), f("Priority", "priority"),
      f("Status", "status"), f("Completed", "bool"), f("Collaborators", "name"),
      f("Tags", "text"),
    ],
    sections: ["My Tasks", "Inbox", "Portfolios", "Goals", "Reporting", "Projects", "Board", "Timeline"],
    actions: ["Add task", "Assign", "Complete", "Set due date", "Add subtask", "Comment", "Move section"],
  },
  kibana: {
    fields: [
      f("Log Level", "text"), f("Message", "desc"), f("Host", "ipv4"),
      f("Service", "text"), f("Timestamp", "datetime"), f("Status Code", "count"),
      f("Response Time", "count"), f("Index", "text"), f("Trace ID", "code"),
      f("Environment", "text"),
    ],
    sections: ["Discover", "Dashboards", "Visualizations", "Alerts", "Maps", "Logs", "APM", "Stack Management"],
    actions: ["New Search", "Add Filter", "Create Visualization", "Save", "Share", "Set Alert", "Refresh"],
  },
  sap: {
    fields: [
      f("Document Number", "code"), f("Company Code", "code"), f("Vendor", "text"),
      f("Material", "code"), f("Quantity", "count"), f("Net Amount", "money"),
      f("Currency", "text"), f("Posting Date", "date"), f("GL Account", "code"),
      f("Purchase Order", "code"), f("Plant", "text"), f("Cost Center", "code"),
    ],
    sections: ["Home", "Purchasing", "Sales", "Finance", "Materials", "Production", "Inventory", "Reports"],
    actions: ["Create PO", "Post", "Approve", "Release", "Reverse", "Display", "Export"],
  },
  okta: {
    fields: [
      f("User", "name"), f("Username", "email"), f("Status", "status"),
      f("Application", "text"), f("Group", "text"), f("Role", "text"),
      f("Last Login", "datetime"), f("MFA Enrolled", "bool"), f("Department", "department"),
      f("Provisioned", "bool"),
    ],
    sections: ["Dashboard", "Directory", "Applications", "Security", "Workflows", "Reports", "Settings", "Devices"],
    actions: ["Add Person", "Assign App", "Activate", "Deactivate", "Reset Password", "Reset MFA", "Suspend"],
  },
  concur: {
    fields: [
      f("Report Name", "text"), f("Employee", "name"), f("Expense Type", "text"),
      f("Amount", "money"), f("Currency", "text"), f("Transaction Date", "date"),
      f("Vendor", "text"), f("Payment Type", "text"), f("Approval Status", "status"),
      f("Billable", "bool"), f("Receipt Attached", "bool"), f("Cost Center", "code"),
    ],
    sections: ["Home", "Expense", "Requests", "Travel", "Approvals", "Reports", "App Center", "Profile"],
    actions: ["New Report", "Add Expense", "Attach Receipt", "Submit", "Approve", "Reject", "Reimburse"],
  },
  pagerduty: {
    fields: [
      f("Incident ID", "code"), f("Title", "text"), f("Urgency", "priority"),
      f("Status", "status"), f("Service", "text"), f("Assigned To", "name"),
      f("Escalation Policy", "text"), f("Triggered At", "datetime"), f("Acknowledged", "bool"),
      f("Priority", "priority"), f("Resolved At", "datetime"),
    ],
    sections: ["Incidents", "Services", "On-Call Schedules", "Escalation Policies", "Alerts", "Analytics", "Automation", "Status Pages"],
    actions: ["Acknowledge", "Resolve", "Reassign", "Escalate", "Snooze", "Add Note", "Run Response Play"],
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

function _hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function _sidBase(): number {
  return _hash(getSessionId());
}
/**
 * The shared case Id for the CURRENT session. Derived from the session id (set on the portal's
 * Session tag, and freshly generated on every page load), so it stays identical across the whole
 * session and changes to a new unique value only when the session changes / the page is refreshed.
 */
export function sessionCaseId(): string {
  return "CS-" + (100000 + (_sidBase() % 900000));
}
/** A per-app, per-session Id for apps that don't carry the shared session Id. */
function _altCaseId(appId: string): string {
  return "CS-" + (100000 + ((_sidBase() ^ _hash(appId)) % 900000));
}

export function commonIdValue(appId: string, i: number): string {
  if (i % 7 === 6) return ""; // an occasional blank Id row anywhere
  const role = appRole(appId);
  // Every PROCESS app shares the same session Id (case-stitchable across the connected process).
  if (role === "process") return sessionCaseId();
  // Non-process (extra / noise): only a RANDOM FEW carry the shared session Id; the rest get their
  // own per-session Id (or an occasional blank for noise apps).
  if (_hash(appId) % 3 === 0) return sessionCaseId();
  if (role === "noise" && i % 3 === 0) return "";
  return _altCaseId(appId);
}

export function schemaFor(appId: string): Schema {
  const base = SCHEMAS[appId] ?? GENERIC;
  return { ...base, fields: [COMMON_ID, ...base.fields, ...CHROME_FIELDS] };
}

