import type { FC } from "react";
import { accentVar, useActive, useView, type View } from "./view";
import { CountedAttributes, fieldItems, InvalidZone } from "./attrs";
import { capacityOf, type AppDef } from "./registry";
import { pii, genValue } from "../lib/pii";

/* ── shared bits ───────────────────────────────────────────── */
function Home({ v }: { v: View }) {
  return (
    <button className="home-dot" title="Acme Intranet" onClick={v.goHome}>
      ⌂
    </button>
  );
}

function Nav({
  v,
  n,
  active,
  onPick,
  cls,
}: {
  v: View;
  n: number;
  active: number;
  onPick: (i: number) => void;
  cls: string;
}) {
  return (
    <nav className={cls}>
      {Array.from({ length: n }, (_, i) => (
        <button
          key={i}
          className={"nav-i" + (i === active ? " on" : "")}
          onClick={() => {
            onPick(i);
            v.goView(v.sec(i), i);
          }}
        >
          {v.sec(i)}
        </button>
      ))}
    </nav>
  );
}

function Tabs({
  v,
  labels,
  active,
  onPick,
}: {
  v: View;
  labels: string[];
  active: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="ribbon-tabs">
      {labels.map((t, i) => (
        <button
          key={t}
          className={"rtab" + (i === active ? " on" : "")}
          onClick={() => {
            onPick(i);
            v.goView(t, 40 + i);
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ToolbarButtons({ v, n }: { v: View; n: number }) {
  return (
    <div className="toolbar">
      {Array.from({ length: n }, (_, i) => (
        <button key={i} type="button" className="tbtn" onClick={() => v.go(v.act(i), i)}>
          {v.act(i)}
        </button>
      ))}
    </div>
  );
}

/* Application menu bar (role=menubar + menu items) */
function MenuBar({ v }: { v: View }) {
  const items = ["File", "Edit", "View", "Insert", "Format", "Tools", "Help"];
  return (
    <div className="menubar" role="menubar" aria-label="Application menu">
      {items.map((m, i) => (
        <button
          key={m}
          type="button"
          role="menuitem"
          aria-haspopup="true"
          className="menuitem"
          onClick={() => v.go(m, 700 + i)}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/* ── Outlook: 3-pane mailbox ───────────────────────────────── */
const MailLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [folder, setFolder] = useActive(0);
  const [sel, setSel] = useActive(0);
  const folders = ["Inbox", "Sent Items", "Drafts", "Deleted", "Archive", "Junk"];
  const base = v.lab(1).base;
  const msgs = fieldItems(app.id, base, cap.valid, v.showPII);
  const current = msgs[Math.min(sel, msgs.length - 1)];
  return (
    <div className="app mail" style={accentVar(v.accent)}>
      <header className="mail-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <button className="mail-new" onClick={() => v.go(v.act(0), 0)}>
          New mail
        </button>
        <input className="mail-search" placeholder={v.fld(0)} aria-label="Search mail" />
        <span className="who">{pii("name", v.lab(6).base + 5)}</span>
      </header>
      <div className="mail-body">
        <nav className="mail-folders">
          {folders.map((f, i) => (
            <button
              key={f}
              className={"mf" + (i === folder ? " on" : "")}
              onClick={() => {
                setFolder(i);
                v.goView(f, i);
              }}
            >
              {f} <span className="badge">{(v.tick + i * 7) % 40}</span>
            </button>
          ))}
        </nav>
        <section className="mail-list">
          <div className="pane-h">{folders[folder]}</div>
          <ul className="msg-list">
            {msgs.map((m, i) => (
              <li
                key={m.id}
                className={"msg" + (i === sel ? " on" : "")}
                onClick={() => {
                  setSel(i);
                  v.goView(m.label, i);
                }}
              >
                <span className="msg-from">{pii("name", base + i)}</span>
                <span className="msg-subj">{m.label}</span>
                <span className="msg-prev">{m.value || "(no preview)"}</span>
                <span className="msg-when">{pii("date", base + i * 3)}</span>
              </li>
            ))}
          </ul>
          <InvalidZone count={cap.invalid} />
        </section>
        <section className="mail-read">
          {current && (
            <>
              <div className="read-subj">{current.label}</div>
              <div className="read-meta">
                <span>
                  <b>{pii("name", base + sel)}</b> &lt;{pii("email", base + sel)}&gt;
                </span>
                <span className="read-date">{pii("date", base + sel)}</span>
              </div>
              <div className="read-body">
                {current.value ? `${current.label}: ${current.value}. ` : ""}
                {genValue("desc", base + sel)}
              </div>
            </>
          )}
          <div className="compose">
            <div className="pane-h">Reply</div>
            {["To", "Cc", "Subject"].map((f, i) => (
              <label key={f} className="c-row">
                <span>{f}</span>
                <input
                  aria-label={f}
                  defaultValue={
                    i === 0
                      ? pii("email", base + i)
                      : i === 2 && current
                        ? "RE: " + current.label
                        : ""
                  }
                />
              </label>
            ))}
            <textarea className="c-body" aria-label="Message body" defaultValue="" />
            <button className="send" onClick={() => v.go("Send", 99)}>
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

/* ── Teams: rail + channels + thread ───────────────────────── */
const TeamsLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [ch, setCh] = useActive(0);
  const rail = ["Ac", "Ch", "Te", "Ca", "Fi", "…"];
  return (
    <div className="app teams" style={accentVar(v.accent)}>
      <nav className="teams-rail" style={{ background: v.accent }}>
        <button className="home-dot light" onClick={v.goHome}>⌂</button>
        {rail.map((r, i) => (
          <button key={i} className="rail-i">{r}</button>
        ))}
      </nav>
      <Nav v={v} n={9} active={ch} onPick={setCh} cls="teams-channels" />
      <section className="teams-main">
        <div className="teams-head"># {v.sec(ch)}</div>
        <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="bubbles" />
        <div className="teams-compose">
          <input placeholder={`Message ${v.sec(ch)}`} />
          <button onClick={() => v.go("Send", 99)}>Send</button>
        </div>
      </section>
    </div>
  );
};

/* ── Copilot: assistant ────────────────────────────────────── */
const CopilotLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  return (
    <div className="app copilot" style={accentVar(v.accent)}>
      <header className="cp-top">
        <Home v={v} />
        <b>{app.name}</b>
        <button className="cp-new" onClick={() => v.goView("New chat", 1)}>New chat</button>
      </header>
      <div className="cp-center">
        <div className="cp-hello" style={{ color: v.accent }}>How can I help today?</div>
        <div className="cp-chips">
          {Array.from({ length: 4 }, (_, i) => (
            <button key={i} className="chip" onClick={() => v.go(v.act(i), i)}>{v.act(i)}</button>
          ))}
        </div>
        <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="bubbles" />
        <div className="cp-prompt">
          <input placeholder="Ask me anything…" />
          <button onClick={() => v.go("Ask", 99)} style={{ background: v.accent }}>➤</button>
        </div>
      </div>
    </div>
  );
};

/* ── Office ribbon shell (Word / PowerPoint / OneNote / Wiki) ─ */
function RibbonEditor({
  app,
  kind,
}: {
  app: AppDef;
  kind: "word" | "slides" | "wiki";
}) {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(0);
  const tabs =
    kind === "slides"
      ? ["Home", "Insert", "Design", "Transitions", "Review", "View"]
      : ["Home", "Insert", "Layout", "References", "Review", "View"];
  return (
    <div className={`app editor ${kind}`} style={accentVar(v.accent)}>
      <header className="ed-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <span className="ed-file">{v.fld(0)}.{kind === "slides" ? "pptx" : "docx"}</span>
        <span className="who">{pii("name", v.lab(2).base + 5)}</span>
      </header>
      <MenuBar v={v} />
      <Tabs v={v} labels={tabs} active={tab} onPick={setTab} />
      <ToolbarButtons v={v} n={10} />
      <div className="ed-extra">
        <label>
          Font
          <select aria-label="Font">
            <option>Calibri</option>
            <option>Arial</option>
            <option>Times New Roman</option>
            <option>Georgia</option>
          </select>
        </label>
        <label>
          Size
          <select aria-label="Font size">
            <option>10</option>
            <option>11</option>
            <option>12</option>
            <option>14</option>
            <option>18</option>
          </select>
        </label>
        <label>
          Zoom
          <select aria-label="Zoom">
            <option>100%</option>
            <option>75%</option>
            <option>125%</option>
            <option>150%</option>
          </select>
        </label>
      </div>
      <div className="ed-body">
        {kind === "slides" && (
          <aside className="slide-rail">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="thumb" onClick={() => v.goView(`Slide ${i + 1}`, i)}>{i + 1}</div>
            ))}
          </aside>
        )}
        {kind === "wiki" && (
          <Nav v={v} n={9} active={0} onPick={(i) => v.goView(v.sec(i), i)} cls="page-tree" />
        )}
        <main className={kind === "slides" ? "slide-canvas" : "doc-canvas"}>
          <h1>{v.sec(0)}</h1>
          {kind !== "slides" && (
            <>
              <p>{v.fld(1)} — {pii("date", v.tick)}. Prepared by {pii("name", v.tick + 3)}.</p>
              <p>{v.fld(2)}. {v.fld(3)}.</p>
              <h2>{v.sec(1)}</h2>
            </>
          )}
          {kind === "slides" && <div className="slide-box">{v.sec(1)}</div>}
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant={kind === "slides" ? "list" : "rows"} />
        </main>
        <aside className="props-pane">
          <div className="pane-h">{kind === "slides" ? "Slide properties" : "Document properties"}</div>
          <div className="pp-row"><span>Owner</span><b>{pii("name", v.tick + 1)}</b></div>
          <div className="pp-row"><span>Modified</span><b>{pii("date", v.tick + 2)}</b></div>
        </aside>
      </div>
    </div>
  );
}
const WordLayout: FC<{ app: AppDef }> = ({ app }) => <RibbonEditor app={app} kind="word" />;
const SlidesLayout: FC<{ app: AppDef }> = ({ app }) => <RibbonEditor app={app} kind="slides" />;
const WikiLayout: FC<{ app: AppDef }> = ({ app }) => <RibbonEditor app={app} kind="wiki" />;

/* ── OneNote: coloured section tabs + note canvas + page list ─ */
const NoteLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [sec, setSec] = useActive(0);
  const [pg, setPg] = useActive(0);
  const colors = ["#7719aa", "#0f6cbd", "#217346", "#c43e1c", "#b7295a", "#0a7d5a"];
  return (
    <div className="app onenote" style={accentVar(v.accent)}>
      <header className="on-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <span className="ed-file">{v.sec(0)} Notebook</span>
        <span className="who">{pii("name", v.lab(2).base + 5)}</span>
      </header>
      <div className="on-sections">
        {Array.from({ length: 6 }, (_, i) => (
          <button
            key={i}
            className={"on-sec" + (i === sec ? " on" : "")}
            style={{ borderTopColor: colors[i % colors.length] }}
            onClick={() => {
              setSec(i);
              v.goView(v.sec(i), i);
            }}
          >
            {v.sec(i)}
          </button>
        ))}
      </div>
      <div className="on-body">
        <main className="on-canvas">
          <h1 className="note-title">{v.fld(0)}</h1>
          <div className="note-date">{pii("date", v.tick)}</div>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="list" />
        </main>
        <aside className="on-pages">
          <div className="pane-h">Pages</div>
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              className={"on-pg" + (i === pg ? " on" : "")}
              onClick={() => {
                setPg(i);
                v.goView(v.fld(i), 20 + i);
              }}
            >
              {v.fld(i)}
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
};

/* ── Excel: formula bar + grid + sheet tabs ────────────────── */
const ExcelLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(0);
  const [sheet, setSheet] = useActive(0);
  return (
    <div className="app excel" style={accentVar(v.accent)}>
      <header className="ed-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <span className="ed-file">{v.fld(0)}.xlsx</span>
        <input className="tellme" id="TellMe-SearchBox" placeholder="Tell me what you want to do" />
      </header>
      <MenuBar v={v} />
      <Tabs v={v} labels={["Home", "Insert", "Formulas", "Data", "Review", "View"]} active={tab} onPick={setTab} />
      <div className="formula-bar">
        <input className="name-box" id="FormulaBar-NameBox-input" defaultValue={`${String.fromCharCode(65 + (v.tick % 8))}${(v.tick % 50) + 1}`} />
        <input className="formula" defaultValue={`=${v.act(0)}`} />
      </div>
      <main className="sheet">
        <input id="m_excelWebRenderer_ewaCtl_gridKeyboardInput" className="grid-kbd" aria-label="grid input" />
        <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="cells" />
      </main>
      <div className="sheet-tabs">
        {["Sheet1", "Sheet2", "Sheet3"].map((s, i) => (
          <button key={s} className={"stab" + (i === sheet ? " on" : "")} onClick={() => { setSheet(i); v.goView(s, i); }}>{s}</button>
        ))}
      </div>
    </div>
  );
};

/* ── ServiceNow / CRM / Test — list view with filter bar ───── */
const RecordsLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  return (
    <div className="app records" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <input className="fr-search" placeholder="Search records" aria-label="Search records" />
        <span className="who">{pii("name", v.lab(4).base + 5)}</span>
      </header>
      <div className="fr-body">
        <Nav v={v} n={9} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="crumb">{app.name} › {v.sec(active)}</div>
          <div className="filter-bar">
            <label>
              State
              <select aria-label="State"><option>All</option><option>Open</option><option>In Progress</option><option>Closed</option></select>
            </label>
            <label>
              Priority
              <select aria-label="Priority"><option>All</option><option>Critical</option><option>High</option><option>Moderate</option><option>Low</option></select>
            </label>
            <label>
              Assigned to
              <select aria-label="Assigned to"><option>Anyone</option><option>Me</option><option>My group</option></select>
            </label>
            <ToolbarButtons v={v} n={3} />
          </div>
          <div className="list-head">{v.sec(active)} · showing {cap.valid} records</div>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="rows" />
        </main>
      </div>
    </div>
  );
};

/* ── SharePoint — document library with command bar ────────── */
const SharePointLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  return (
    <div className="app sp" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <input className="fr-search" placeholder="Search this site" aria-label="Search this site" />
        <span className="who">{pii("name", v.lab(4).base + 5)}</span>
      </header>
      <div className="fr-body">
        <Nav v={v} n={8} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="cmd-bar">
            {["New", "Upload", "Sync", "Export to Excel", "Share", "Automate"].map((c, i) => (
              <button key={c} type="button" className="cmd" onClick={() => v.go(c, i)}>
                {c}
              </button>
            ))}
          </div>
          <div className="crumb">{app.name} › Documents › {v.sec(active)}</div>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="rows" />
        </main>
      </div>
    </div>
  );
};

/* ── HRMS — people directory + employee profile ───────────── */
const HRMSLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  const base = v.lab(1).base;
  return (
    <div className="app hrms" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <input className="fr-search" placeholder="Search people" aria-label="Search people" />
        <span className="who">{pii("name", v.lab(4).base + 5)}</span>
      </header>
      <div className="fr-body">
        <Nav v={v} n={6} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="crumb">{app.name} › {v.sec(active)}</div>
          <div className="people">
            {Array.from({ length: 8 }, (_, i) => {
              const nm = pii("name", base + i * 3);
              return (
                <button key={i} type="button" className="person" onClick={() => v.go(nm, i)}>
                  <span className="avatar">{nm.split(" ").map((s) => s[0]).join("")}</span>
                  <span className="p-name">{nm}</span>
                  <span className="p-title">{v.fld(i)}</span>
                </button>
              );
            })}
          </div>
          <div className="list-head">Employee profile</div>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="grid" />
        </main>
      </div>
    </div>
  );
};

/* ── Dynamic Forms — stepper + sectioned form ──────────────── */
const FormsLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [step, setStep] = useActive(1);
  const steps = ["Applicant", "Details", "Review", "Submit"];
  return (
    <div className="app forms" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <span className="who">{pii("name", v.lab(4).base + 5)}</span>
      </header>
      <div className="forms-wrap">
        <ol className="stepper">
          {steps.map((s, i) => (
            <li key={s} className={"step" + (i === step ? " on" : "") + (i < step ? " done" : "")}>
              <span className="step-n">{i + 1}</span> {s}
            </li>
          ))}
        </ol>
        <main className="forms-main">
          <h2>
            {steps[step]} — {v.sec(0)}
          </h2>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="grid" />
          <div className="form-nav">
            <button type="button" onClick={() => { const n = Math.max(0, step - 1); setStep(n); v.goView(steps[n], n); }}>
              Back
            </button>
            <button type="button" className="primary" onClick={() => { const n = Math.min(steps.length - 1, step + 1); setStep(n); v.goView(steps[n], n); }}>
              {step >= steps.length - 1 ? "Submit" : "Next"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

/* ── Azure — resource nav + blade tabs + Essentials ────────── */
const AzureLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [blade, setBlade] = useActive(0);
  const nav = ["Home", "Resource groups", "All resources", "App Services", "SQL databases", "Storage accounts", "Monitor", "Cost Management", "Security Center", "Advisor"];
  const tabs = ["Overview", "Activity log", "Access control (IAM)", "Tags", "Properties", "Locks"];
  return (
    <div className="app azure" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <input className="fr-search" placeholder="Search resources, services, and docs" aria-label="Search" />
        <span className="who">{pii("email", v.lab(4).base + 5)}</span>
      </header>
      <div className="fr-body">
        <nav className="fr-side az-nav">
          {nav.map((n, i) => (
            <button key={n} type="button" className={"nav-i" + (i === 0 ? " on" : "")} onClick={() => v.goView(n, i)}>
              <span className="az-ic">{n.slice(0, 2)}</span> {n}
            </button>
          ))}
        </nav>
        <main className="fr-main">
          <div className="crumb">Home › Resource groups › {v.sec(0)} › {v.fld(0)}</div>
          <div className="blade-tabs">
            {tabs.map((t, i) => (
              <button key={t} type="button" className={"rtab" + (i === blade ? " on" : "")} onClick={() => { setBlade(i); v.goView(t, 40 + i); }}>
                {t}
              </button>
            ))}
          </div>
          <div className="essentials">
            <div className="pp-row"><span>Status</span><b>Running</b></div>
            <div className="pp-row"><span>Location</span><b>East US {v.tick % 3}</b></div>
            <div className="pp-row"><span>Subscription</span><b>{genValue("code", v.tick)}</b></div>
            <div className="pp-row"><span>Resource group</span><b>{v.sec(0)}</b></div>
            <div className="pp-row"><span>Owner</span><b>{pii("email", v.tick + 1)}</b></div>
          </div>
          <div className="list-head">Properties</div>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="props" />
        </main>
      </div>
    </div>
  );
};

/* ── Jira board ────────────────────────────────────────────── */
const BoardLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(0);
  return (
    <div className="app board" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <span className="who">{pii("name", v.lab(4).base + 5)}</span>
      </header>
      <Tabs v={v} labels={["Board", "Backlog", "Sprints", "Reports"]} active={tab} onPick={setTab} />
      <div className="board-area">
        <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="board" />
      </div>
    </div>
  );
};

/* ── Dashboard (Tableau / Grafana) ─────────────────────────── */
const DashboardLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  return (
    <div className="app dash" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <span className="who">{pii("name", v.lab(2).base + 5)}</span>
      </header>
      <div className="dash-filters">
        {Array.from({ length: 5 }, (_, i) => (
          <label key={i}>{v.fld(i)}<select><option>{v.sec(i)}</option></select></label>
        ))}
      </div>
      <div className="chart-grid">
        {Array.from({ length: 6 }, (_, i) => {
          const pts = Array.from({ length: 12 }, (_, b) => {
            const x = (b / 11) * 100;
            const y = 40 - ((v.tick * 7 + i * 29 + b * b * 5) % 34);
            return `${x},${y}`;
          }).join(" ");
          return (
            <div key={i} className="chart-tile">
              <div className="ct-h">{v.sec(i)}</div>
              <div className="ct-metric">{genValue("count", v.tick + i)}</div>
              <svg className="spark" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={pts} fill="none" stroke={v.accent} strokeWidth="2" />
              </svg>
            </div>
          );
        })}
      </div>
      <div className="dash-table">
        <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="rows" />
      </div>
    </div>
  );
};

/* ── Git repo ──────────────────────────────────────────────── */
const RepoLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(0);
  return (
    <div className="app repo" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <select className="branch"><option>main</option><option>develop</option><option>qa</option></select>
        <button className="tbtn" onClick={() => v.go("Clone", 0)}>Clone</button>
      </header>
      <Tabs v={v} labels={["Code", "Issues", "Pull requests", "Actions", "Wiki"]} active={tab} onPick={setTab} />
      <div className="fr-body">
        <nav className="fr-side">
          {Array.from({ length: 8 }, (_, i) => (
            <button key={i} className="nav-i file" onClick={() => v.goView(v.fld(i), i)}>
              <span className="gicon">{i % 3 === 0 ? "▸" : "·"}</span>{" "}
              {v.fld(i).replace(/\s+/g, "_").toLowerCase()}
              {i % 3 === 0 ? "/" : ".ts"}
            </button>
          ))}
        </nav>
        <main className="fr-main">
          <div className="crumb">{app.name} / {v.sec(0)} / {v.viewName}</div>
          <div className="readme">
            <div className="readme-h">README.md</div>
            <h3>{v.sec(0)}</h3>
            <p>{genValue("desc", v.tick)}</p>
          </div>
          <div className="list-head">Recent commits</div>
          <div className="commits">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="commit-row">
                <code className="commit-sha">
                  {((v.lab(1).base + i * 1013) % 0xfffffff).toString(16).slice(0, 7)}
                </code>
                <span className="commit-msg">{v.sec(i)}</span>
                <span className="commit-who">{pii("name", v.lab(1).base + i)}</span>
                <span className="commit-when">{pii("date", v.lab(1).base + i * 3)}</span>
              </div>
            ))}
          </div>
          <div className="list-head">Changed files</div>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="rows" />
        </main>
      </div>
    </div>
  );
};

/* ── Jenkins CI: job dashboard + build history + config form ─ */
const CiLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const st = ["ok", "fail", "run", "warn"];
  const weather = ["sun", "cloud", "rain"];
  const sideNav = ["New Item", "People", "Build History", "Manage Jenkins", "My Views"];
  const JOBS = 9;
  return (
    <div className="app ci" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <button className="tbtn" onClick={() => v.go("Build Now", 0)}>Build Now</button>
        <span className="who">{pii("name", v.lab(2).base + 5)}</span>
      </header>
      <div className="fr-body">
        <nav className="fr-side">
          {sideNav.map((t, i) => (
            <button key={t} className="nav-i" onClick={() => v.goView(t, i)}>
              {t}
            </button>
          ))}
        </nav>
        <main className="fr-main">
          <div className="crumb">{app.name} › Dashboard</div>
          <table className="jenkins-jobs">
            <thead>
              <tr>
                <th>S</th>
                <th>W</th>
                <th>Name</th>
                <th>Last Success</th>
                <th>Last Failure</th>
                <th>Duration</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: JOBS }, (_, i) => (
                <tr key={i}>
                  <td><span className={`ball ${st[i % 4]}`} /></td>
                  <td><span className={`wx wx-${weather[i % 3]}`} /></td>
                  <td>
                    <button className="jlink" onClick={() => v.goView(v.sec(i), i)}>
                      {v.sec(i)}
                    </button>
                  </td>
                  <td>{pii("date", v.lab(2).base + i)}</td>
                  <td>{i % 3 === 1 ? pii("date", v.lab(2).base + i * 3) : "N/A"}</td>
                  <td>{((v.tick + i * 7) % 55) + 1} min</td>
                  <td>
                    <button className="jrun" title="Build now" onClick={() => v.go("Run " + v.sec(i), i)}>
                      ▶
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="crumb" style={{ marginTop: 16 }}>
            {v.viewName} › Configure › Build parameters
          </div>
          <CountedAttributes lab={v.lab(1)} valid={cap.valid} invalid={cap.invalid} appId={v.app.id} showPII={v.showPII} role={v.role} variant="rows" />
        </main>
      </div>
    </div>
  );
};

/* ── dispatch ──────────────────────────────────────────────── */
const BY_ID: Record<string, FC<{ app: AppDef }>> = {
  outlook: MailLayout,
  teams: TeamsLayout,
  copilot: CopilotLayout,
  word: WordLayout,
  powerpoint: SlidesLayout,
  onenote: NoteLayout,
  wiki: WikiLayout,
  excel: ExcelLayout,
  jira: BoardLayout,
  servicenow: RecordsLayout,
  crm: RecordsLayout,
  testcase: RecordsLayout,
  sharepoint: SharePointLayout,
  hrms: HRMSLayout,
  tableau: DashboardLayout,
  monitoring: DashboardLayout,
  azure: AzureLayout,
  git: RepoLayout,
  jenkins: CiLayout,
  forms: FormsLayout,
};

export function getLayout(app: AppDef): FC<{ app: AppDef }> {
  return BY_ID[app.id] ?? RecordsLayout;
}
