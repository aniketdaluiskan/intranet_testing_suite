import { useRef, useState, type FC, type ReactNode } from "react";
import { accentVar, useActive, useSelection, useView, type View } from "./view";
import { CountedAttributes, fieldItems } from "./attrs";
import { capacityOf, type AppDef } from "./registry";
import { pii, genValue } from "../lib/pii";
import { hostFor } from "../lib/hosts";
import { usePanel, closePanel } from "./panel";
import { ScenariosLayout } from "./scenarios";

/* ══════════════ shared chrome ══════════════ */

/** Home button. NOTE: keeps the `home-dot` class — the autopilot deliberately
 * skips it so a sweep doesn't leave the app before exploring it. */
function Home({ v, light = false }: { v: View; light?: boolean }) {
  return (
    <button className={"home-dot" + (light ? " light" : "")} title="Acme Intranet" onClick={v.goHome}>
      ⌂
    </button>
  );
}

/** Circular initials avatar from a synthetic name. */
function Avatar({ seed, size = "sm" }: { seed: number; size?: "sm" | "md" }) {
  const nm = pii("name", seed);
  const initials = nm
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  return (
    <span className={"avatar " + size} title={nm} aria-hidden="true">
      {initials}
    </span>
  );
}

/** Internal service address chip (e.g. servicenow.corp.acme.local). */
function EnvChip({ id }: { id: string }) {
  return (
    <span className="app-url" title="Internal service address">
      🔒 {hostFor(id)}
    </span>
  );
}

/** Real microphone access for huddles/calls (getUserMedia). */
function useMic() {
  const [state, setState] = useState<"idle" | "starting" | "live" | "denied" | "unavailable">(
    "idle",
  );
  const [muted, setMuted] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const start = async () => {
    if (state === "live" || state === "starting") return;
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    // getUserMedia only exists in a secure context (https or http://localhost).
    if (!md || typeof md.getUserMedia !== "function") {
      setState("unavailable");
      return;
    }
    setState("starting");
    try {
      const s = await md.getUserMedia({ audio: true });
      streamRef.current = s;
      setMuted(false);
      setState("live");
    } catch {
      setState("denied");
    }
  };
  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  };
  const toggleMute = () => {
    const s = streamRef.current;
    if (!s) return;
    const next = !muted;
    s.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };
  return { state, muted, start, stop, toggleMute };
}

/** Live huddle/meeting bar with mic level + mute/leave. */
function HuddleBar({ mic, label }: { mic: ReturnType<typeof useMic>; label: string }) {
  if (mic.state === "idle") return null;
  if (mic.state === "starting") {
    return (
      <div className="huddle live">
        <span className="huddle-dot" /> Connecting to {label}… allow microphone access in the prompt.
      </div>
    );
  }
  if (mic.state === "unavailable") {
    return (
      <div className="huddle denied">
        🎤 Microphone needs a secure context — open this over <b>https://</b> or{" "}
        <b>http://localhost</b> (an http:// IP address will not work).
      </div>
    );
  }
  if (mic.state === "denied") {
    return (
      <div className="huddle denied">
        🎤 Microphone blocked — allow mic access in your browser to join the {label}.
        <button className="huddle-btn" onClick={mic.start}>
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="huddle live">
      <span className="huddle-dot" /> {label} live
      <span className={"mic-eq" + (mic.muted ? " off" : "")}>
        <i />
        <i />
        <i />
        <i />
      </span>
      <button className="huddle-btn" onClick={mic.toggleMute}>
        {mic.muted ? "🔇 Unmute" : "🎤 Mute"}
      </button>
      <button className="huddle-btn leave" onClick={mic.stop}>
        Leave
      </button>
    </div>
  );
}

/** Coloured status pill (tone inferred from the word). */
function StatusPill({ text }: { text: string }) {
  const k = text.toLowerCase();
  const tone = /(open|active|running|sent|triggered|\bnew\b)/.test(k)
    ? "go"
    : /(closed|done|complete|approved|resolved|paid|merged|signed)/.test(k)
      ? "ok"
      : /(reject|fail|denied|overdue|void|declin|blocked)/.test(k)
        ? "bad"
        : /(pending|hold|waiting|review|draft|progress)/.test(k)
          ? "warn"
          : "neutral";
  return <span className={"pill pill-" + tone}>{text}</span>;
}

/** A real, working filter checkbox for app chrome (flips its own state). */
function FilterToggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <label className={"f-toggle" + (on ? " on" : "")}>
      <input type="checkbox" checked={on} onChange={() => setOn((x) => !x)} /> {label}
    </label>
  );
}

/** Product top bar: home, monogram, title, optional search, right slot + avatar. */
function AppTopBar({
  v,
  search,
  right,
  cls = "",
}: {
  v: View;
  search?: string;
  right?: ReactNode;
  cls?: string;
}) {
  return (
    <header className={"app-top " + cls} style={{ background: v.accent }}>
      <Home v={v} />
      <span className="app-mono">{v.app.monogram}</span>
      <b className="app-title">{v.app.name}</b>
      <EnvChip id={v.app.id} />
      {search !== undefined && (
        <input className="app-search" placeholder={search} aria-label={search} />
      )}
      <div className="app-top-right">
        {right}
        <button
          className="top-ic"
          type="button"
          aria-label="Notifications"
          onClick={() => v.go("Notifications", 81)}
        >
          🔔
        </button>
        <Avatar seed={v.lab(4).base + 5} />
      </div>
    </header>
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

/** KPI card strip. */
function Kpis({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  return (
    <div className="kpi-row">
      {items.map((k) => (
        <div className={"kpi" + (k.tone ? " " + k.tone : "")} key={k.label}>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

/** Activity/audit timeline. */
function Timeline({ v, n }: { v: View; n: number }) {
  return (
    <ol className="timeline">
      {Array.from({ length: n }, (_, i) => (
        <li key={i}>
          <span className="tl-dot" style={{ background: v.accent }} />
          <div className="tl-body">
            <div className="tl-title">
              {v.act(i)} — {v.sec(i)}
            </div>
            <div className="tl-meta">
              <Avatar seed={v.tick + i} /> {pii("name", v.tick + i)} · {pii("date", v.tick + i * 2)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Salesforce-style chevron stage path. */
function StagePath({ stages, active }: { stages: string[]; active: number }) {
  return (
    <ol className="stage-path">
      {stages.map((s, i) => (
        <li key={s} className={"stage" + (i < active ? " done" : "") + (i === active ? " on" : "")}>
          {s}
        </li>
      ))}
    </ol>
  );
}

/** Progress donut. */
function Donut({ pct, accent }: { pct: number; accent: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <svg className="donut" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="8"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700">
        {pct}%
      </text>
    </svg>
  );
}

/* ══════════════ Outlook: 3-pane mailbox ══════════════ */
const MailLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [folder, setFolder] = useActive(0);
  const [sel, setSel] = useActive(0);
  const [focused, setFocused] = useActive(0);
  const folders = ["Inbox", "Sent Items", "Drafts", "Deleted", "Archive", "Junk Email"];
  const base = v.lab(1).base;
  const msgs = fieldItems(app.id, base, 12, v.showPII); // decorative email rows
  const pick = useSelection(msgs.length);
  const current = msgs[Math.min(sel, msgs.length - 1)];
  return (
    <div className="app mail" style={accentVar(v.accent)}>
      <header className="mail-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <EnvChip id={app.id} />
        <button className="mail-new" onClick={() => v.go(v.act(0), 0)}>
          + New mail
        </button>
        <div className="mail-ribbon">
          {["Reply", "Reply all", "Forward", "Archive", "Delete", "Flag"].map((r, i) => (
            <button key={r} className="ribbon-btn" onClick={() => v.go(r, 30 + i)}>
              {r}
            </button>
          ))}
        </div>
        <input className="mail-search" placeholder="Search mail" aria-label="Search mail" />
        <Avatar seed={base + 5} />
      </header>
      <div className="mail-body">
        <nav className="mail-folders">
          <button className="mail-newfolder" onClick={() => v.go("New folder", 88)}>
            Favorites
          </button>
          {folders.map((fn, i) => (
            <button
              key={fn}
              className={"mf" + (i === folder ? " on" : "")}
              onClick={() => {
                setFolder(i);
                v.goView(fn, i);
              }}
            >
              {fn} <span className="badge">{(v.tick + i * 7) % 40}</span>
            </button>
          ))}
        </nav>
        <section className="mail-list">
          <div className="mail-list-head">
            <div className="focus-tabs">
              <button
                className={"focus-tab" + (focused === 0 ? " on" : "")}
                onClick={() => {
                  setFocused(0);
                  v.goView("Focused", 60);
                }}
              >
                Focused
              </button>
              <button
                className={"focus-tab" + (focused === 1 ? " on" : "")}
                onClick={() => {
                  setFocused(1);
                  v.goView("Other", 61);
                }}
              >
                Other
              </button>
            </div>
            <FilterToggle label="Unread" />
          </div>
          <ul className="msg-list">
            {msgs.map((m, i) => (
              <li
                key={m.id}
                className={"msg" + (i === sel ? " on" : "") + (pick.isChecked(i) ? " picked" : "")}
              >
                <input
                  type="checkbox"
                  className="msg-check"
                  aria-label={`Select message from ${pii("name", base + i)}`}
                  checked={pick.isChecked(i)}
                  onChange={() => pick.toggle(i)}
                />
                <button
                  className="msg-open"
                  onClick={() => {
                    setSel(i);
                    v.goView(genValue("text", base + i), i);
                  }}
                >
                  <span className="msg-from">{pii("name", base + i)}</span>
                  <span className="msg-subj">{genValue("text", base + i)}</span>
                  <span className="msg-prev">{m.value || genValue("desc", base + i)}</span>
                  <span className="msg-when">{pii("date", base + i * 3)}</span>
                </button>
                <input
                  type="checkbox"
                  className="msg-flag"
                  aria-label={`Flag message ${m.label}`}
                  title="Flag"
                />
              </li>
            ))}
          </ul>
        </section>
        <section className="mail-read">
          {current && (
            <>
              <div className="read-subj">{genValue("text", base + sel)}</div>
              <div className="read-meta">
                <span>
                  <Avatar seed={base + sel} /> <b>{pii("name", base + sel)}</b> &lt;
                  {pii("email", base + sel)}&gt;
                </span>
                <span className="read-date">{pii("date", base + sel)}</span>
              </div>
              <div className="read-body">{genValue("desc", base + sel)}</div>
              <div className="pane-h">Message details</div>
              <CountedAttributes
                lab={v.lab(1)}
                valid={cap.valid}
                invalid={cap.invalid}
                appId={v.app.id}
                showPII={v.showPII}
                role={v.role}
                variant="form"
              />
            </>
          )}
          <div className="compose">
            <div className="pane-h">Reply</div>
            {["To", "Cc", "Subject"].map((fn, i) => (
              <label key={fn} className="c-row">
                <span>{fn}</span>
                <input
                  aria-label={fn}
                  defaultValue={
                    i === 0
                      ? pii("email", base + i)
                      : i === 2 && current
                        ? "RE: " + genValue("text", base + sel)
                        : ""
                  }
                />
              </label>
            ))}
            <textarea className="c-body" aria-label="Message body" defaultValue="" />
            <label className="fc chk">
              <input type="checkbox" /> Request a read receipt
            </label>
            <button className="send" onClick={() => v.go("Send", 99)}>
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

/* ══════════════ Teams: rail + channels + thread ══════════════ */
const TeamsLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [ch, setCh] = useActive(0);
  const mic = useMic();
  const rail = [
    { i: "◎", t: "Activity" },
    { i: "💬", t: "Chat" },
    { i: "👥", t: "Teams" },
    { i: "📅", t: "Calendar" },
    { i: "📞", t: "Calls" },
    { i: "📁", t: "Files" },
  ];
  return (
    <div className="app teams" style={accentVar(v.accent)}>
      <nav className="teams-rail" style={{ background: v.accent }}>
        <button className="home-dot light" onClick={v.goHome}>
          ⌂
        </button>
        {rail.map((r, i) => (
          <button key={i} className="rail-i" title={r.t} onClick={() => v.goView(r.t, i)}>
            <span className="rail-ic">{r.i}</span>
            <span className="rail-lbl">{r.t}</span>
          </button>
        ))}
      </nav>
      <aside className="teams-channels">
        <div className="teams-team">
          <span className="team-badge" style={{ background: v.accent }}>
            {app.monogram}
          </span>
          <b>{v.sec(0)} Team</b>
        </div>
        <FilterToggle label="Show only unread" />
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            className={"nav-i chan" + (i === ch ? " on" : "")}
            onClick={() => {
              setCh(i);
              v.goView(v.sec(i), i);
            }}
          >
            # {v.sec(i)}
            {i % 3 === 0 && <span className="chan-unread">{(v.tick + i) % 9}</span>}
          </button>
        ))}
      </aside>
      <section className="teams-main">
        <div className="teams-head">
          <b># {v.sec(ch)}</b>
          <div className="teams-tabs">
            {["Posts", "Files", "Wiki", "+"].map((t, i) => (
              <button key={t} className="teams-tab" onClick={() => v.goView(t, 50 + i)}>
                {t}
              </button>
            ))}
          </div>
          <button className="teams-meet" onClick={mic.start} title="Meet — enables microphone">
            📹 Meet
          </button>
        </div>
        <HuddleBar mic={mic} label="meeting" />
        <CountedAttributes
          lab={v.lab(1)}
          valid={cap.valid}
          invalid={cap.invalid}
          appId={v.app.id}
          showPII={v.showPII}
          role={v.role}
          variant="chat"
        />
        <div className="teams-compose">
          <button className="compose-ic" title="Format" onClick={() => v.goView("Format", 82)}>
            A
          </button>
          <button className="compose-ic" title="Attach" onClick={() => v.go("Attach file", 83)}>
            📎
          </button>
          <input placeholder={`Message # ${v.sec(ch)}`} aria-label="Message" />
          <button className="send-btn" onClick={() => v.go("Send", 99)}>
            Send
          </button>
        </div>
      </section>
    </div>
  );
};

/* ══════════════ Slack: workspace rail + sidebar + messages ══════════════ */
const SlackLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [ch, setCh] = useActive(0);
  const base = v.lab(1).base;
  const mic = useMic();
  const sidebarTop = ["Threads", "Mentions & reactions", "Drafts", "Saved items"];
  return (
    <div className="app slack" style={accentVar(v.accent)}>
      <nav className="slack-rail" style={{ background: v.accent }}>
        <button className="home-dot light" onClick={v.goHome}>
          ⌂
        </button>
        <button className="ws-badge" onClick={() => v.goView(v.sec(0), 0)}>
          {app.monogram}
        </button>
        <button className="rail-round" title="DMs" onClick={() => v.goView("Direct messages", 1)}>
          ✉
        </button>
        <button className="rail-round" title="Activity" onClick={() => v.goView("Activity", 2)}>
          ◎
        </button>
        <button className="rail-round add" title="Add" onClick={() => v.go("Add", 84)}>
          +
        </button>
      </nav>
      <aside className="slack-side" style={{ background: v.accent }}>
        <div className="slack-ws">
          <b>{v.sec(0)} HQ</b>
          <button className="slack-compose" title="Compose" onClick={() => v.go("New message", 85)}>
            ✎
          </button>
        </div>
        <FilterToggle label="Unreads only" />
        <div className="slack-group">
          {sidebarTop.map((s, i) => (
            <button key={s} className="slack-item" onClick={() => v.goView(s, 60 + i)}>
              {s}
            </button>
          ))}
        </div>
        <div className="slack-group-h">Channels</div>
        {Array.from({ length: 8 }, (_, i) => (
          <button
            key={i}
            className={"slack-item chan" + (i === ch ? " on" : "")}
            onClick={() => {
              setCh(i);
              v.goView(v.sec(i), i);
            }}
          >
            <span className="hash">{i % 4 === 0 ? "🔒" : "#"}</span> {v.sec(i).toLowerCase().replace(/\s+/g, "-")}
          </button>
        ))}
        <div className="slack-group-h">Direct messages</div>
        {Array.from({ length: 4 }, (_, i) => (
          <button key={i} className="slack-item dm" onClick={() => v.go(pii("name", base + i), i)}>
            <span className={"presence " + (i % 2 ? "away" : "on")} /> {pii("name", base + i * 5)}
          </button>
        ))}
      </aside>
      <section className="slack-main">
        <div className="slack-head">
          <b># {v.sec(ch).toLowerCase().replace(/\s+/g, "-")}</b>
          <span className="slack-topic">{genValue("text", base)}</span>
          <button className="slack-huddle" onClick={mic.start} title="Start huddle — enables microphone">
            🎧 Huddle
          </button>
          <span className="slack-members">👤 {(v.tick % 40) + 3}</span>
        </div>
        <HuddleBar mic={mic} label="huddle" />
        <div className="slack-msgs">
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="chat"
          />
        </div>
        <div className="slack-compose-box">
          <div className="slack-fmt">
            <button title="Bold" onClick={() => v.goView("Bold", 86)}>
              B
            </button>
            <button title="Italic" onClick={() => v.goView("Italic", 87)}>
              i
            </button>
            <button title="Link" onClick={() => v.go("Insert link", 88)}>
              🔗
            </button>
            <button title="Attach" onClick={() => v.go("Attach file", 89)}>
              📎
            </button>
          </div>
          <input placeholder={`Message #${v.sec(ch).toLowerCase().replace(/\s+/g, "-")}`} aria-label="Message" />
          <button className="send-btn" onClick={() => v.go("Send", 99)}>
            ➤
          </button>
        </div>
      </section>
    </div>
  );
};

/* ══════════════ Copilot: history + assistant ══════════════ */
const CopilotLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const base = v.lab(1).base;
  return (
    <div className="app copilot" style={accentVar(v.accent)}>
      <aside className="cp-side">
        <button className="cp-new" onClick={() => v.goView("New chat", 1)}>
          ✎ New chat
        </button>
        <div className="cp-side-h">Recent</div>
        {Array.from({ length: 8 }, (_, i) => (
          <button key={i} className="cp-hist" onClick={() => v.goView(genValue("text", base + i), i)}>
            {genValue("text", base + i)}
          </button>
        ))}
      </aside>
      <div className="cp-panel">
        <header className="cp-top">
          <Home v={v} />
          <b>{app.name}</b>
          <EnvChip id={app.id} />
          <select className="cp-model" aria-label="Model">
            <option>GPT-4o</option>
            <option>Reasoning</option>
            <option>Fast</option>
          </select>
          <div className="cp-scope">
            <FilterToggle label="Work" defaultOn />
            <FilterToggle label="Web" />
          </div>
        </header>
        <div className="cp-center">
          <div className="cp-hello" style={{ color: v.accent }}>
            How can I help today?
          </div>
          <div className="cp-chips">
            {Array.from({ length: 4 }, (_, i) => (
              <button key={i} className="chip" onClick={() => v.go(v.act(i), i)}>
                <span className="chip-ic" style={{ background: v.accent }}>
                  {["✦", "◈", "❖", "✎"][i]}
                </span>
                {v.act(i)}
              </button>
            ))}
          </div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="chat"
          />
          <div className="cp-prompt">
            <button className="cp-attach" title="Attach" onClick={() => v.go("Attach file", 90)}>
              📎
            </button>
            <input placeholder="Message Copilot…" aria-label="Prompt" />
            <button className="cp-send" onClick={() => v.go("Ask", 99)} style={{ background: v.accent }}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════ Office ribbon shell (Word / PowerPoint / OneNote / Wiki / Notion) ══════════════ */
function RibbonEditor({ app, kind }: { app: AppDef; kind: "word" | "slides" | "wiki" }) {
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
        <EnvChip id={app.id} />
        <span className="ed-file">
          {genValue("text", v.tick).replace(/\s+/g, "-")}.{kind === "slides" ? "pptx" : "docx"}
        </span>
        <span className="ed-saved">Saved to cloud</span>
        <div className="ed-collab">
          <Avatar seed={v.lab(2).base + 5} />
          <Avatar seed={v.lab(2).base + 9} />
        </div>
      </header>
      {app.id !== "notion" && <MenuBar v={v} />}
      {app.id !== "notion" && <Tabs v={v} labels={tabs} active={tab} onPick={setTab} />}
      {app.id !== "notion" && <ToolbarButtons v={v} n={6} />}
      {app.id !== "notion" && (
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
        <FilterToggle label="Track Changes" />
        <FilterToggle label="Show comments" defaultOn />
      </div>
      )}
      <div className="ed-body">
        {kind === "slides" && (
          <aside className="slide-rail">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="thumb" onClick={() => v.goView(`Slide ${i + 1}`, i)}>
                {i + 1}
              </div>
            ))}
          </aside>
        )}
        {kind === "wiki" && (
          <Nav v={v} n={9} active={0} onPick={(i) => v.goView(v.sec(i), i)} cls="page-tree" />
        )}
        <main className={kind === "slides" ? "slide-canvas" : "doc-canvas"}>
          <h1>
            {genValue("text", v.tick)} {kind === "wiki" ? "Guide" : "Report"}
          </h1>
          {kind !== "slides" && (
            <>
              <p className="doc-meta">
                Prepared by {pii("name", v.tick + 3)} · {pii("date", v.tick)} ·{" "}
                {genValue("department", v.tick + 1)}
              </p>
              <p>{genValue("desc", v.tick + 2)}</p>
              <p>{genValue("desc", v.tick + 5)}</p>
              <h2>{genValue("text", v.tick + 7)}</h2>
            </>
          )}
          {kind === "slides" && <div className="slide-box">{genValue("text", v.tick + 1)}</div>}
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
        </main>
        <aside className="props-pane">
          <div className="pane-h">{kind === "slides" ? "Slide properties" : "Document properties"}</div>
          <div className="pp-row">
            <span>Owner</span>
            <b>{pii("name", v.tick + 1)}</b>
          </div>
          <div className="pp-row">
            <span>Modified</span>
            <b>{pii("date", v.tick + 2)}</b>
          </div>
          <div className="pp-row">
            <span>Status</span>
            <StatusPill text={genValue("status", v.tick)} />
          </div>
        </aside>
      </div>
    </div>
  );
}
const WordLayout: FC<{ app: AppDef }> = ({ app }) => <RibbonEditor app={app} kind="word" />;
const SlidesLayout: FC<{ app: AppDef }> = ({ app }) => <RibbonEditor app={app} kind="slides" />;
const WikiLayout: FC<{ app: AppDef }> = ({ app }) => <RibbonEditor app={app} kind="wiki" />;

/* ══════════════ OneNote: coloured section tabs + canvas + pages ══════════════ */
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
        <EnvChip id={app.id} />
        <span className="ed-file">{v.sec(0)} Notebook</span>
        <Avatar seed={v.lab(2).base + 5} />
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
          <h1 className="note-title">{genValue("text", v.tick)}</h1>
          <div className="note-date">{pii("date", v.tick)}</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="list"
          />
        </main>
        <aside className="on-pages">
          <div className="pane-h">Pages</div>
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              className={"on-pg" + (i === pg ? " on" : "")}
              onClick={() => {
                setPg(i);
                v.goView(genValue("text", v.lab(1).base + i), 20 + i);
              }}
            >
              {genValue("text", v.lab(1).base + i)}
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
};

/* ══════════════ Excel: formula bar + grid + sheet tabs ══════════════ */
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
        <EnvChip id={app.id} />
        <span className="ed-file">{genValue("text", v.tick).replace(/\s+/g, "-")}.xlsx</span>
        <input
          className="tellme"
          id="TellMe-SearchBox"
          placeholder="Tell me what you want to do"
        />
        <Avatar seed={v.lab(2).base + 5} />
      </header>
      <MenuBar v={v} />
      <Tabs
        v={v}
        labels={["Home", "Insert", "Formulas", "Data", "Review", "View"]}
        active={tab}
        onPick={setTab}
      />
      <div className="formula-bar">
        <input
          className="name-box"
          id="FormulaBar-NameBox-input"
          defaultValue={`${String.fromCharCode(65 + (v.tick % 8))}${(v.tick % 50) + 1}`}
        />
        <span className="fx">fx</span>
        <input className="formula" defaultValue={`=SUM(A1:A${(v.tick % 40) + 2})`} />
      </div>
      <main className="sheet">
        <input
          id="m_excelWebRenderer_ewaCtl_gridKeyboardInput"
          className="grid-kbd"
          aria-label="grid input"
        />
        <CountedAttributes
          lab={v.lab(1)}
          valid={cap.valid}
          invalid={cap.invalid}
          appId={v.app.id}
          showPII={v.showPII}
          role={v.role}
          variant="cells"
        />
      </main>
      <div className="sheet-tabs">
        {["Sheet1", "Ledger", "Budget", "Pivot"].map((s, i) => (
          <button
            key={s}
            className={"stab" + (i === sheet ? " on" : "")}
            onClick={() => {
              setSheet(i);
              v.goView(s, i);
            }}
          >
            {s}
          </button>
        ))}
        <button className="stab add" onClick={() => v.go("New sheet", 9)}>
          +
        </button>
      </div>
    </div>
  );
};

/* ══════════════ ServiceNow / Zendesk / PagerDuty / SAP / Okta ══════════════ */
const ServiceNowLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  const [navTab, setNavTab] = useActive(0);
  const [related, setRelated] = useActive(0);
  const relatedLists = ["Activity", "Related Records", "Affected CIs", "Approvers", "Attachments"];
  const base = v.lab(1).base;
  const SKIN: Record<
    string,
    { newLabel: string; tabs: string[]; conditions: boolean; hero?: "oncall" | "fiori" | "okta" | "zendesk" }
  > = {
    servicenow: { newLabel: "New", tabs: ["☰", "★", "🕘"], conditions: true },
    zendesk: { newLabel: "Add", tabs: ["Views", "Search", "Admin"], conditions: false, hero: "zendesk" },
    pagerduty: { newLabel: "New Incident", tabs: ["Incidents", "Services", "On-Call"], conditions: true, hero: "oncall" },
    sap: { newLabel: "Create", tabs: ["Home", "Apps", "Recents"], conditions: false, hero: "fiori" },
    okta: { newLabel: "Add Person", tabs: ["Dashboard", "Directory", "Apps"], conditions: false, hero: "okta" },
  };
  const skin = SKIN[app.id] ?? SKIN.servicenow;
  return (
    <div className="app snow" style={accentVar(v.accent)}>
      <header className="snow-top" style={{ background: v.accent }}>
        <Home v={v} light />
        <b>{app.name}</b>
        <EnvChip id={app.id} />
        <input className="snow-nav-search" placeholder="Type filter text" aria-label="Filter navigator" />
        <div className="app-top-right">
          <button className="top-ic" aria-label="Help" onClick={() => v.go("Help", 91)}>
            ?
          </button>
          <Avatar seed={v.lab(4).base + 5} />
        </div>
      </header>
      <div className="fr-body">
        <nav className="snow-nav">
          <div className="snow-nav-tabs">
            {skin.tabs.map((t, i) => (
              <button
                key={t}
                className={"snow-nav-tab" + (i === navTab ? " on" : "")}
                onClick={() => {
                  setNavTab(i);
                  v.goView(v.sec(i), i);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="snow-modules">
            {Array.from({ length: 9 }, (_, i) => (
              <button
                key={i}
                className={"nav-i" + (i === active ? " on" : "")}
                onClick={() => {
                  setActive(i);
                  v.goView(v.sec(i), i);
                }}
              >
                {v.sec(i)}
              </button>
            ))}
          </div>
        </nav>
        <main className="fr-main">
          <div className="crumb">
            {app.name} › {v.sec(active)}
          </div>
          {skin.hero === "oncall" && (
            <div className="pd-oncall">
              <span className="pd-dot" /> On-call now: <b>{pii("name", base + 2)}</b> · Escalation policy{" "}
              {v.sec(1)}
              <StatusPill text="Triggered" />
            </div>
          )}
          {skin.hero === "fiori" && (
            <div className="fiori-tiles">
              {Array.from({ length: 6 }, (_, i) => (
                <button key={i} className="fiori-tile" onClick={() => v.goView(v.sec(i), i)}>
                  <span className="fiori-ic" style={{ background: v.accent }}>
                    {v.sec(i).slice(0, 2)}
                  </span>
                  <span className="fiori-nm">{v.sec(i)}</span>
                  <span className="fiori-ct">{(base + i * 13) % 90}</span>
                </button>
              ))}
            </div>
          )}
          {skin.hero === "okta" && (
            <Kpis
              items={[
                { label: "Users", value: String(200 + (v.tick % 800)) },
                { label: "Applications", value: String(20 + (v.tick % 60)) },
                { label: "Groups", value: String(10 + (v.tick % 40)) },
                { label: "MFA Enrolled", value: 70 + (v.tick % 30) + "%", tone: "ok" },
              ]}
            />
          )}
          {skin.hero === "zendesk" && (
            <div className="zd-views">
              {(
                [
                  ["Open", "go"],
                  ["Pending", "warn"],
                  ["Solved", "ok"],
                  ["Unassigned", "bad"],
                ] as const
              ).map(([n, t], i) => (
                <div key={n} className={"zd-view zd-" + t}>
                  <b>{(base + i * 7) % 60}</b> {n}
                </div>
              ))}
            </div>
          )}
          <div className="snow-listtitle">
            <b>{v.sec(active)}</b>
            <div className="snow-list-actions">
              <button className="tbtn primary" onClick={() => v.go(skin.newLabel, 0)}>
                {skin.newLabel}
              </button>
              <input className="snow-search" placeholder="Search" aria-label="Search" />
              <button className="tbtn" onClick={() => v.go("Search", 1)}>
                Go
              </button>
            </div>
          </div>
          {skin.conditions && (
          <div className="filter-bar snow-conditions">
            <label>
              State
              <select aria-label="State">
                <option>All</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>On Hold</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>
            </label>
            <label>
              Priority
              <select aria-label="Priority">
                <option>-- All --</option>
                <option>1 - Critical</option>
                <option>2 - High</option>
                <option>3 - Moderate</option>
                <option>4 - Low</option>
              </select>
            </label>
            <label>
              Assignment group
              <select aria-label="Assignment group">
                <option>Any</option>
                <option>Service Desk</option>
                <option>Network</option>
                <option>Database</option>
              </select>
            </label>
            <ToolbarButtons v={v} n={3} />
          </div>
          )}
          <div className="list-head">
            {v.sec(active)} · showing {cap.valid} records
          </div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="table"
            select
          />
          <div className="snow-related">
            <div className="rel-tabs">
              {relatedLists.map((r, i) => (
                <button
                  key={r}
                  className={"rel-tab" + (i === related ? " on" : "")}
                  onClick={() => {
                    setRelated(i);
                    v.goView(r, 70 + i);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <Timeline v={v} n={4} />
          </div>
        </main>
      </div>
    </div>
  );
};

/* ══════════════ CRM (Salesforce-style) ══════════════ */
const CrmLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [obj, setObj] = useActive(1);
  const base = v.lab(1).base;
  const objects = ["Home", "Accounts", "Contacts", "Leads", "Opportunities", "Reports", "Dashboards"];
  const stages = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won"];
  const stageIdx = v.tick % stages.length;
  return (
    <div className="app crm" style={accentVar(v.accent)}>
      <header className="crm-top" style={{ background: v.accent }}>
        <Home v={v} light />
        <span className="app-mono">{app.monogram}</span>
        <b>{app.name}</b>
        <EnvChip id={app.id} />
        <input className="app-search" placeholder="Search Salesforce" aria-label="Search" />
        <div className="app-top-right">
          <button className="top-ic" aria-label="Notifications" onClick={() => v.go("Notifications", 92)}>
            🔔
          </button>
          <Avatar seed={base + 5} />
        </div>
      </header>
      <nav className="crm-objs">
        {objects.map((o, i) => (
          <button
            key={o}
            className={"crm-obj" + (i === obj ? " on" : "")}
            onClick={() => {
              setObj(i);
              v.goView(o, i);
            }}
          >
            {o}
          </button>
        ))}
      </nav>
      <div className="crm-highlight">
        <div className="crm-hl-left">
          <div className="crm-hl-type">Account</div>
          <div className="crm-hl-name">{genValue("text", base)} Corp</div>
          <div className="crm-hl-fields">
            <span>
              <i>Owner</i> {pii("name", base + 2)}
            </span>
            <span>
              <i>Amount</i> {pii("amount", base + 3)}
            </span>
            <span>
              <i>Close Date</i> {pii("date", base + 4)}
            </span>
            <span>
              <i>Stage</i> <StatusPill text={stages[stageIdx]} />
            </span>
          </div>
        </div>
        <StagePath stages={stages} active={stageIdx} />
      </div>
      <div className="crm-body">
        <main className="crm-main">
          <div className="list-head">Details</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
        </main>
        <aside className="crm-activity">
          <div className="pane-h">Activity</div>
          <div className="crm-tasks">
            {Array.from({ length: 5 }, (_, i) => (
              <label key={i} className="crm-task">
                <input type="checkbox" aria-label={`Complete task ${v.act(i)}`} defaultChecked={i % 3 === 0} />
                <span className="crm-task-body">
                  <b>{v.act(i)}</b>
                  <span className="crm-task-meta">
                    {pii("name", base + i)} · {pii("date", base + i * 2)}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="pane-h">Timeline</div>
          <Timeline v={v} n={4} />
        </aside>
      </div>
    </div>
  );
};

/* ══════════════ Test Management ══════════════ */
const TestCaseLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  const [tab, setTab] = useActive(1);
  const tabs = ["Test Suites", "Test Cases", "Test Runs", "Defects"];
  const passed = 40 + (v.tick % 55);
  const failed = 5 + (v.tick % 18);
  const blocked = v.tick % 9;
  const total = passed + failed + blocked;
  const pct = Math.round((passed / total) * 100);
  return (
    <div className="app tcm" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search test cases" />
      <Tabs v={v} labels={tabs} active={tab} onPick={setTab} />
      <div className="fr-body">
        <nav className="fr-side tcm-tree">
          <div className="pane-h">Suites</div>
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              className={"nav-i" + (i === active ? " on" : "")}
              onClick={() => {
                setActive(i);
                v.goView(v.sec(i), i);
              }}
            >
              <span className="tree-caret">{i % 2 ? "▸" : "▾"}</span> {v.sec(i)}
            </button>
          ))}
        </nav>
        <main className="fr-main">
          <div className="crumb">
            {app.name} › {v.sec(active)}
          </div>
          <div className="tcm-run">
            <Donut pct={pct} accent={v.accent} />
            <div className="tcm-counts">
              <div className="tcm-count ok">
                <b>{passed}</b> Passed
              </div>
              <div className="tcm-count bad">
                <b>{failed}</b> Failed
              </div>
              <div className="tcm-count warn">
                <b>{blocked}</b> Blocked
              </div>
              <div className="tcm-count">
                <b>{total}</b> Total
              </div>
            </div>
            <div className="tcm-run-actions">
              {["Run", "Pass", "Fail", "Block"].map((a, i) => (
                <button key={a} className={"tbtn run-" + a.toLowerCase()} onClick={() => v.go(a, i)}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="tcm-bar">
            <FilterToggle label="Automated only" />
            <FilterToggle label="My assigned" defaultOn />
            <span className="tcm-hint">Tick a row to include it in the next run</span>
          </div>
          <div className="list-head">Test cases · {cap.valid}</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="table"
            select
          />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ Payroll / Concur (money lines + approvals) ══════════════ */
const PayrollLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  const base = v.lab(1).base;
  const rows = 8;
  const approve = useSelection(rows);
  return (
    <div className="app payroll" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search employees" />
      <div className="fr-body">
        <Nav v={v} n={8} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="crumb">
            {app.name} › {v.sec(active)}
          </div>
          <Kpis
            items={
              app.id === "concur"
                ? [
                    { label: "Report Total", value: pii("amount", base + 1) },
                    { label: "Approved", value: pii("amount", base + 2), tone: "ok" },
                    { label: "Out-of-Pocket", value: pii("amount", base + 3), tone: "warn" },
                    { label: "Line Items", value: String(4 + (v.tick % 20)) },
                  ]
                : [
                    { label: "Gross Pay", value: pii("amount", base + 1) },
                    { label: "Net Pay", value: pii("amount", base + 2), tone: "ok" },
                    { label: "Tax Withheld", value: pii("amount", base + 3), tone: "warn" },
                    { label: "Headcount", value: String(120 + (v.tick % 40)) },
                  ]
            }
          />
          <div className="pay-run">
            <div className="list-head">
              {app.id === "concur" ? "Expense report" : "Pay run"} — {v.sec(active)}
              <span className="pay-run-status">
                <StatusPill text={genValue("status", v.tick)} />
              </span>
            </div>
            <table className="pay-lines">
              <thead>
                <tr>
                  <th className="chk">
                    <input
                      type="checkbox"
                      aria-label="Approve all lines"
                      checked={approve.allChecked}
                      onChange={approve.toggleAll}
                    />
                  </th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, i) => (
                  <tr key={i} className={approve.isChecked(i) ? "sel" : ""}>
                    <td className="chk">
                      <input
                        type="checkbox"
                        aria-label={`Approve ${pii("name", base + i)}`}
                        checked={approve.isChecked(i)}
                        onChange={() => approve.toggle(i)}
                      />
                    </td>
                    <td>
                      <Avatar seed={base + i} /> {pii("name", base + i)}
                    </td>
                    <td>{genValue("department", base + i)}</td>
                    <td>{pii("amount", base + i * 3)}</td>
                    <td>{pii("amount", base + i * 5)}</td>
                    <td>
                      <StatusPill text={i === 0 ? "Approved" : genValue("status", base + i)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pay-approve-bar">
              <span>{approve.count} selected</span>
              <button className="tbtn primary" onClick={() => v.go("Approve selected", 5)}>
                Approve selected
              </button>
            </div>
          </div>
          <div className="list-head">Pay components</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ Insurance Claims ══════════════ */
const InsuranceLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  const base = v.lab(1).base;
  return (
    <div className="app claims" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search claims" />
      <div className="fr-body">
        <Nav v={v} n={8} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="claim-banner" style={{ borderLeftColor: v.accent }}>
            <div className="claim-banner-main">
              <div className="claim-no">{genValue("code", base)}</div>
              <div className="claim-sub">
                Policyholder <b>{pii("name", base + 1)}</b> · Policy {genValue("code", base + 2)}
              </div>
            </div>
            <StatusPill text={genValue("status", v.tick)} />
          </div>
          <Kpis
            items={[
              { label: "Claim Amount", value: pii("amount", base + 3) },
              { label: "Approved", value: pii("amount", base + 4), tone: "ok" },
              { label: "Reserve", value: pii("amount", base + 5), tone: "warn" },
              { label: "Deductible", value: pii("amount", base + 6) },
            ]}
          />
          <div className="claim-flags">
            <FilterToggle label="Litigation" />
            <FilterToggle label="SIU Referral" />
            <FilterToggle label="Total Loss" />
          </div>
          <div className="list-head">Claim details</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
          <div className="list-head">Claim timeline</div>
          <Timeline v={v} n={5} />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ SharePoint / Drive — document library ══════════════ */
const SharePointLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  const base = v.lab(1).base;
  const FILES = 10;
  const files = useSelection(FILES);
  const exts = ["docx", "xlsx", "pdf", "pptx"];
  const ftypes = ["doc", "xls", "pdf", "ppt"];
  return (
    <div className="app sp" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search this site" />
      <div className="sp-sitebar" style={{ borderTopColor: v.accent }}>
        <span className="sp-sitelogo" style={{ background: v.accent }}>
          {app.monogram}
        </span>
        <b>{app.id === "drive" ? "My Drive" : `${v.sec(0)} Team Site`}</b>
        <button
          className="sp-follow"
          onClick={() => v.go(app.id === "drive" ? "New folder" : "Following", 93)}
        >
          {app.id === "drive" ? "＋ New" : "☆ Follow"}
        </button>
      </div>
      <div className="fr-body">
        <Nav v={v} n={8} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="cmd-bar">
            {["+ New", "↑ Upload", "⟳ Sync", "Export to Excel", "Share", "Automate"].map((c, i) => (
              <button key={c} type="button" className="cmd" onClick={() => v.go(c, i)}>
                {c}
              </button>
            ))}
            <span className="cmd-count">{files.count > 0 ? `${files.count} selected` : ""}</span>
          </div>
          <div className="crumb">
            {app.name} › Documents › {v.sec(active)}
          </div>
          <table className="sp-files">
            <thead>
              <tr>
                <th className="chk">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={files.allChecked}
                    onChange={files.toggleAll}
                  />
                </th>
                <th>Name</th>
                <th>Modified</th>
                <th>Modified By</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: FILES }, (_, i) => {
                const nm = `${genValue("text", base + i).replace(/\s+/g, "_")}.${exts[i % 4]}`;
                return (
                  <tr key={i} className={files.isChecked(i) ? "sel" : ""}>
                    <td className="chk">
                      <input
                        type="checkbox"
                        aria-label={`Select ${nm}`}
                        checked={files.isChecked(i)}
                        onChange={() => files.toggle(i)}
                      />
                    </td>
                    <td>
                      <span className={"ftype ft-" + ftypes[i % 4]}>{ftypes[i % 4]}</span>
                      <button className="sp-fname" onClick={() => v.go(nm, i)}>
                        {nm}
                      </button>
                    </td>
                    <td>{pii("date", base + i)}</td>
                    <td>{pii("name", base + i * 2)}</td>
                    <td>{((v.tick * 7 + i * 13) % 900) + 10} KB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="list-head">Document details</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ HRMS / Workday — people directory + profile ══════════════ */
const HRMSLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  const [ptab, setPtab] = useActive(0);
  const base = v.lab(1).base;
  const ptabs = ["Personal", "Job", "Compensation", "Time Off", "Documents"];
  const TITLES = ["Analyst", "Manager", "Engineer", "Specialist", "Director", "Coordinator", "Lead", "Consultant"];
  return (
    <div className="app hrms" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search people" />
      <div className="fr-body">
        <Nav v={v} n={8} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="crumb">
            {app.name} › {v.sec(active)}
          </div>
          {app.id === "workday" && (
            <div className="wd-inbox">
              <b>Awaiting your action</b> · {(v.tick % 6) + 1} approvals · {(v.tick % 4) + 1} tasks ·{" "}
              {(v.tick % 3) + 1} time-off requests
            </div>
          )}
          <div className="people">
            {Array.from({ length: 8 }, (_, i) => {
              const nm = pii("name", base + i * 3);
              return (
                <button key={i} type="button" className="person" onClick={() => v.go(nm, i)}>
                  <span className="avatar md">{nm.split(" ").map((s) => s[0]).join("")}</span>
                  <span className="p-name">{nm}</span>
                  <span className="p-title">{TITLES[i % TITLES.length]}</span>
                  <span className="p-dept">{genValue("department", base + i)}</span>
                </button>
              );
            })}
          </div>
          <div className="hrms-profile">
            <div className="rel-tabs">
              {ptabs.map((t, i) => (
                <button
                  key={t}
                  className={"rel-tab" + (i === ptab ? " on" : "")}
                  onClick={() => {
                    setPtab(i);
                    v.goView(t, 70 + i);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="list-head">Employee profile</div>
            <CountedAttributes
              lab={v.lab(1)}
              valid={cap.valid}
              invalid={cap.invalid}
              appId={v.app.id}
              showPII={v.showPII}
              role={v.role}
              variant="form"
            />
          </div>
        </main>
      </div>
    </div>
  );
};

/* ══════════════ Dynamic Forms — stepper ══════════════ */
const FormsLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [step, setStep] = useActive(1);
  const steps = ["Applicant", "Details", "Review", "Submit"];
  return (
    <div className="app forms" style={accentVar(v.accent)}>
      <AppTopBar v={v} />
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
          <label className="fc chk form-sameas">
            <input type="checkbox" /> Mailing address same as applicant
          </label>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
          <label className="fc chk form-consent">
            <input type="checkbox" required /> I confirm the information provided is accurate and
            consent to processing.
          </label>
          <div className="form-nav">
            <button
              type="button"
              onClick={() => {
                const n = Math.max(0, step - 1);
                setStep(n);
                v.goView(steps[n], n);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                const n = Math.min(steps.length - 1, step + 1);
                setStep(n);
                v.goView(steps[n], n);
              }}
            >
              {step >= steps.length - 1 ? "Submit" : "Next"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

/* ══════════════ DocuSign — envelopes + signing ══════════════ */
const DocuSignLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(3);
  const base = v.lab(1).base;
  const tabs = ["Inbox", "Sent", "Action Required", "Waiting for Others", "Completed"];
  const recipients = 4;
  const signed = useSelection(recipients);
  return (
    <div className="app docusign" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search envelopes" />
      <Tabs v={v} labels={tabs} active={tab} onPick={setTab} />
      <div className="fr-body">
        <main className="fr-main ds-main">
          <div className="ds-envelopes">
            <div className="list-head">Envelopes</div>
            {Array.from({ length: 6 }, (_, i) => (
              <button key={i} className="ds-env" onClick={() => v.go(genValue("text", base + i), i)}>
                <span className="ds-env-name">{genValue("text", base + i)} Agreement.pdf</span>
                <span className="ds-env-from">{pii("name", base + i)}</span>
                <StatusPill text={["Sent", "Completed", "Waiting", "Action Required"][i % 4]} />
                <span className="ds-env-date">{pii("date", base + i * 2)}</span>
              </button>
            ))}
          </div>
          <div className="ds-sign">
            <div className="pane-h">Recipients &amp; signing order</div>
            <ol className="ds-recips">
              {Array.from({ length: recipients }, (_, i) => (
                <li key={i} className="ds-recip">
                  <span className="ds-order">{i + 1}</span>
                  <span className="ds-recip-body">
                    <b>{pii("name", base + i * 3)}</b>
                    <span className="ds-recip-email">{pii("email", base + i * 3)}</span>
                  </span>
                  <label className="ds-signed">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${pii("name", base + i * 3)} signed`}
                      checked={signed.isChecked(i)}
                      onChange={() => signed.toggle(i)}
                    />
                    Signed
                  </label>
                </li>
              ))}
            </ol>
            <div className="list-head">Envelope fields</div>
            <CountedAttributes
              lab={v.lab(1)}
              valid={cap.valid}
              invalid={cap.invalid}
              appId={v.app.id}
              showPII={v.showPII}
              role={v.role}
              variant="form"
            />
            <label className="fc chk ds-consent">
              <input type="checkbox" required /> I agree to use electronic records and signatures.
            </label>
            <div className="form-nav">
              <button type="button" onClick={() => v.go("Other actions", 8)}>
                Other actions
              </button>
              <button type="button" className="primary" onClick={() => v.go("Finish", 9)}>
                Finish
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

/* ══════════════ Zoom — meetings ══════════════ */
const ZoomLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(0);
  const base = v.lab(1).base;
  const tabs = ["Upcoming", "Previous", "Personal Room", "Recordings"];
  return (
    <div className="app zoom" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search" />
      <Tabs v={v} labels={tabs} active={tab} onPick={setTab} />
      <div className="zoom-body">
        <section className="zoom-list">
          <div className="zoom-quick">
            {["New Meeting", "Join", "Schedule", "Share Screen"].map((q, i) => (
              <button key={q} className="zoom-quick-btn" onClick={() => v.go(q, i)}>
                <span className="zoom-quick-ic" style={{ background: v.accent }}>
                  {["📹", "＋", "📅", "⬆"][i]}
                </span>
                {q}
              </button>
            ))}
          </div>
          <div className="list-head">Meetings — {v.sec(0)}</div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="zoom-meeting">
              <div className="zoom-time">
                <b>{String((v.tick + i) % 12 || 12).padStart(2, "0")}:00</b>
                <span>{(v.tick + i) % 2 ? "PM" : "AM"}</span>
              </div>
              <div className="zoom-meta">
                <b>{genValue("text", base + i)} Sync</b>
                <span>
                  Meeting ID {genValue("code", base + i)} · Host {pii("name", base + i)}
                </span>
              </div>
              <div className="zoom-actions">
                <button className="tbtn primary" onClick={() => v.go("Start", i)}>
                  Start
                </button>
                <button className="tbtn" onClick={() => v.go("Copy Invitation", i)}>
                  Copy Invitation
                </button>
              </div>
            </div>
          ))}
        </section>
        <aside className="zoom-schedule">
          <div className="pane-h">Schedule Meeting</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
          <div className="zoom-opts">
            <label className="fc chk">
              <input type="checkbox" defaultChecked /> Enable waiting room
            </label>
            <label className="fc chk">
              <input type="checkbox" /> Record the meeting automatically
            </label>
            <label className="fc chk">
              <input type="checkbox" defaultChecked /> Require meeting passcode
            </label>
            <label className="fc chk">
              <input type="checkbox" /> Mute participants on entry
            </label>
          </div>
          <button className="tbtn primary zoom-save" onClick={() => v.go("Save", 9)}>
            Save
          </button>
        </aside>
      </div>
    </div>
  );
};

/* ══════════════ Azure — resource blade ══════════════ */
const AzureLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [blade, setBlade] = useActive(0);
  const base = v.lab(1).base;
  const resName = (i: number) =>
    ["vm", "sql", "app", "kv", "stg", "cosmos"][i % 6] + "-" + genValue("code", base + i).toLowerCase();
  const nav = [
    "Home",
    "Resource groups",
    "All resources",
    "App Services",
    "SQL databases",
    "Storage accounts",
    "Monitor",
    "Cost Management",
    "Security Center",
    "Advisor",
  ];
  const tabs = ["Overview", "Activity log", "Access control (IAM)", "Tags", "Properties", "Locks"];
  const resources = 6;
  const picked = useSelection(resources);
  return (
    <div className="app azure" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search resources, services, and docs" />
      <div className="fr-body">
        <nav className="fr-side az-nav">
          {nav.map((n, i) => (
            <button
              key={n}
              type="button"
              className={"nav-i" + (i === 0 ? " on" : "")}
              onClick={() => v.goView(n, i)}
            >
              <span className="az-ic" style={{ background: v.accent }}>
                {n.slice(0, 2)}
              </span>{" "}
              {n}
            </button>
          ))}
        </nav>
        <main className="fr-main">
          <div className="crumb">
            Home › Resource groups › {v.sec(0)} › {resName(0)}
          </div>
          <div className="blade-tabs">
            {tabs.map((t, i) => (
              <button
                key={t}
                type="button"
                className={"rtab" + (i === blade ? " on" : "")}
                onClick={() => {
                  setBlade(i);
                  v.goView(t, 40 + i);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="essentials">
            <div className="pp-row">
              <span>Status</span>
              <StatusPill text="Running" />
            </div>
            <div className="pp-row">
              <span>Location</span>
              <b>East US {v.tick % 3}</b>
            </div>
            <div className="pp-row">
              <span>Subscription</span>
              <b>{genValue("code", v.tick)}</b>
            </div>
            <div className="pp-row">
              <span>Resource group</span>
              <b>{v.sec(0)}</b>
            </div>
            <div className="pp-row">
              <span>Owner</span>
              <b>{pii("email", v.tick + 1)}</b>
            </div>
          </div>
          <div className="az-reslist-head">
            <b>Resources</b>
            <FilterToggle label="Show hidden types" />
          </div>
          <table className="az-resources">
            <thead>
              <tr>
                <th className="chk">
                  <input
                    type="checkbox"
                    aria-label="Select all resources"
                    checked={picked.allChecked}
                    onChange={picked.toggleAll}
                  />
                </th>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: resources }, (_, i) => (
                <tr key={i} className={picked.isChecked(i) ? "sel" : ""}>
                  <td className="chk">
                    <input
                      type="checkbox"
                      aria-label={`Select ${v.fld(i)}`}
                      checked={picked.isChecked(i)}
                      onChange={() => picked.toggle(i)}
                    />
                  </td>
                  <td>
                    <span className="az-ic sm" style={{ background: v.accent }} /> {resName(i)}
                  </td>
                  <td>{genValue("text", base + i)}</td>
                  <td>East US {i % 3}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="list-head">Properties</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ Jira / Asana board ══════════════ */
const BoardLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(0);
  const base = v.lab(1).base;
  return (
    <div className="app board" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search issues" />
      <div className="board-head">
        <div className="board-head-left">
          <b>
            {app.id === "asana"
              ? `${v.sec(0)} · My Tasks`
              : `${v.sec(0)} Sprint ${(v.tick % 30) + 1}`}
          </b>
          <span className="board-sprint-meta">
            {app.id === "asana"
              ? `${cap.valid} tasks · due this week`
              : `${(v.tick % 10) + 2} days remaining · ${cap.valid} issues`}
          </span>
        </div>
        <div className="board-avatars">
          {Array.from({ length: 4 }, (_, i) => (
            <Avatar key={i} seed={base + i * 4} />
          ))}
        </div>
        <FilterToggle label={app.id === "asana" ? "Only my tasks" : "Only my issues"} />
      </div>
      <Tabs
        v={v}
        labels={
          app.id === "asana"
            ? ["List", "Board", "Timeline", "Calendar"]
            : ["Board", "Backlog", "Sprints", "Reports"]
        }
        active={tab}
        onPick={setTab}
      />
      <div className="board-area">
        <CountedAttributes
          lab={v.lab(1)}
          valid={cap.valid}
          invalid={cap.invalid}
          appId={v.app.id}
          showPII={v.showPII}
          role={v.role}
          variant="board"
        />
      </div>
    </div>
  );
};

/* ══════════════ Dashboards (Tableau / Grafana / Power BI / Kibana) ══════════════ */
const DashboardLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const flavor =
    app.id === "tableau"
      ? "tableau"
      : app.id === "monitoring" || app.id === "kibana"
        ? "grafana"
        : app.id === "powerbi"
          ? "powerbi"
          : "generic";
  const series = useSelection(5);
  const seriesNames = ["Actual", "Target", "Forecast", "Prior Year", "Budget"];
  return (
    <div className={"app dash flavor-" + flavor} style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search" cls={flavor === "grafana" ? "dark" : ""} />
      {flavor === "grafana" && (
        <div className="grafana-timebar">
          <button className="time-pick" onClick={() => v.goView("Time range", 94)}>
            🕘 Last 6 hours
          </button>
          <button className="time-pick" onClick={() => v.goView("Refresh", 95)}>
            ⟳ 30s
          </button>
          <FilterToggle label="Live tail" />
        </div>
      )}
      <div className="dash-filters">
        {Array.from({ length: 5 }, (_, i) => (
          <label key={i}>
            {v.fld(i)}
            <select aria-label={v.fld(i)}>
              <option>{v.sec(i)}</option>
              <option>{v.sec(i + 1)}</option>
            </select>
          </label>
        ))}
      </div>
      <div className="dash-shell">
        {flavor === "tableau" && (
          <aside className="tab-shelves">
            <div className="pane-h">Data</div>
            {["Columns", "Rows", "Filters", "Marks", "Pages"].map((s, i) => (
              <div key={s} className="shelf">
                <span className="shelf-h">{s}</span>
                <span className="pill-chip">{v.fld(i)}</span>
              </div>
            ))}
          </aside>
        )}
        <div className="dash-canvas">
          <div className="chart-grid">
            {Array.from({ length: 6 }, (_, i) => {
              const pts = Array.from({ length: 12 }, (_, b) => {
                const x = (b / 11) * 100;
                const y = 40 - ((v.tick * 7 + i * 29 + b * b * 5) % 34);
                return `${x},${y}`;
              }).join(" ");
              const bars = Array.from({ length: 7 }, (_, b) => ((v.tick + i * 5 + b * 11) % 34) + 6);
              return (
                <div key={i} className="chart-tile">
                  <div className="ct-h">{v.sec(i)}</div>
                  <div className="ct-metric">{genValue("count", v.tick + i)}</div>
                  {i % 2 === 0 ? (
                    <svg className="spark" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
                      <polyline points={pts} fill="none" stroke={v.accent} strokeWidth="2" />
                    </svg>
                  ) : (
                    <div className="minibars" aria-hidden="true">
                      {bars.map((h, b) => (
                        <span key={b} style={{ height: h + "px", background: v.accent }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="dash-legend">
            {seriesNames.map((s, i) => (
              <label key={s} className={"legend-item" + (series.isChecked(i) ? "" : " off")}>
                <input
                  type="checkbox"
                  aria-label={`Toggle ${s}`}
                  checked={series.isChecked(i)}
                  onChange={() => series.toggle(i)}
                />
                <span className="legend-swatch" style={{ background: v.accent, opacity: 1 - i * 0.15 }} />
                {s}
              </label>
            ))}
          </div>
          <div className="dash-table">
            <CountedAttributes
              lab={v.lab(1)}
              valid={cap.valid}
              invalid={cap.invalid}
              appId={v.app.id}
              showPII={v.showPII}
              role={v.role}
              variant="table"
            />
          </div>
        </div>
        {flavor === "powerbi" && (
          <aside className="pbi-fields">
            <div className="pane-h">Fields</div>
            {Array.from({ length: 8 }, (_, i) => (
              <label key={i} className="pbi-field">
                <input type="checkbox" aria-label={v.fld(i)} defaultChecked={i < 3} /> {v.fld(i)}
              </label>
            ))}
          </aside>
        )}
      </div>
      {flavor === "powerbi" && (
        <div className="pbi-pages">
          {["Overview", "Revenue", "Pipeline", "Detail"].map((p, i) => (
            <button key={p} className={"pbi-page" + (i === 0 ? " on" : "")} onClick={() => v.goView(p, 80 + i)}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════ Git / Bitbucket repo ══════════════ */
const RepoLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [tab, setTab] = useActive(0);
  const base = v.lab(1).base;
  const FILES = 8;
  const staged = useSelection(FILES);
  return (
    <div className="app repo" style={accentVar(v.accent)}>
      <header className="repo-top" style={{ background: v.accent }}>
        <Home v={v} light />
        <span className="repo-path">
          acme / <b>{v.sec(0).toLowerCase().replace(/\s+/g, "-")}</b>
        </span>
        <EnvChip id={app.id} />
        <div className="repo-stats">
          <button className="repo-stat" onClick={() => v.go("Star", 96)}>
            ☆ Star {(v.tick % 90) + 4}
          </button>
          <button className="repo-stat" onClick={() => v.go("Fork", 97)}>
            ⑃ Fork {(v.tick % 30) + 1}
          </button>
          <button className="repo-stat" onClick={() => v.go("Watch", 98)}>
            👁 Watch
          </button>
        </div>
      </header>
      <Tabs
        v={v}
        labels={
          app.id === "bitbucket"
            ? ["Source", "Commits", "Branches", "Pull requests", "Pipelines"]
            : ["Code", "Issues", "Pull requests", "Actions", "Wiki"]
        }
        active={tab}
        onPick={setTab}
      />
      <div className="fr-body">
        <main className="fr-main">
          <div className="repo-bar">
            <select className="branch" aria-label="Branch">
              <option>main</option>
              <option>develop</option>
              <option>qa</option>
            </select>
            <span className="repo-lastcommit">
              Latest commit <code>{((base + 7) % 0xfffffff).toString(16).slice(0, 7)}</code> ·{" "}
              {pii("date", base)}
            </span>
            <button className="tbtn primary" onClick={() => v.go("Clone", 0)}>
              ⤓ Code
            </button>
          </div>
          <table className="repo-files">
            <thead>
              <tr>
                <th className="chk">
                  <input
                    type="checkbox"
                    aria-label="Stage all files"
                    checked={staged.allChecked}
                    onChange={staged.toggleAll}
                  />
                </th>
                <th>File</th>
                <th>Last commit</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: FILES }, (_, i) => (
                <tr key={i} className={staged.isChecked(i) ? "sel" : ""}>
                  <td className="chk">
                    <input
                      type="checkbox"
                      aria-label={`Stage ${v.fld(i)}`}
                      checked={staged.isChecked(i)}
                      onChange={() => staged.toggle(i)}
                    />
                  </td>
                  <td className="file-name">
                    <span className="gicon">{i % 3 === 0 ? "📁" : "📄"}</span>{" "}
                    <button className="repo-fbtn" onClick={() => v.goView(v.fld(i), i)}>
                      {v.fld(i).replace(/\s+/g, "_").toLowerCase()}
                      {i % 3 === 0 ? "/" : ".ts"}
                    </button>
                  </td>
                  <td className="file-msg">{v.sec(i)}</td>
                  <td className="file-who">{pii("date", base + i * 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="readme">
            <div className="readme-h">📖 README.md</div>
            <h3>{genValue("text", v.tick)}</h3>
            <p>{genValue("desc", v.tick)}</p>
          </div>
          <label className="fc chk repo-draft">
            <input type="checkbox" /> Create pull request as draft
          </label>
          <div className="list-head">Changed files</div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="table"
          />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ Jenkins CI ══════════════ */
const CiLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const st = ["ok", "fail", "run", "warn"];
  const weather = ["sun", "cloud", "rain"];
  const sideNav = ["New Item", "People", "Build History", "Manage Jenkins", "My Views", "Credentials"];
  const JOBS = 9;
  return (
    <div className="app ci" style={accentVar(v.accent)}>
      <header className="fr-top" style={{ background: v.accent }}>
        <Home v={v} />
        <b>{app.name}</b>
        <button className="tbtn light" onClick={() => v.go("Build Now", 0)}>
          ▶ Build Now
        </button>
        <Avatar seed={v.lab(2).base + 5} />
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
                  <td>
                    <span className={`ball ${st[i % 4]}`} />
                  </td>
                  <td>
                    <span className={`wx wx-${weather[i % 3]}`} />
                  </td>
                  <td>
                    <button
                      className="jlink"
                      onClick={() => v.goView(genValue("text", v.lab(2).base + i), i)}
                    >
                      {genValue("text", v.lab(2).base + i).toLowerCase().replace(/\s+/g, "-")}
                    </button>
                  </td>
                  <td>{pii("date", v.lab(2).base + i)}</td>
                  <td>{i % 3 === 1 ? pii("date", v.lab(2).base + i * 3) : "N/A"}</td>
                  <td>{((v.tick + i * 7) % 55) + 1} min</td>
                  <td>
                    <button className="jrun" title="Build now" onClick={() => v.go("Build Now", i)}>
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
          <div className="ci-params">
            <label className="fc chk">
              <input type="checkbox" defaultChecked /> Build after other projects are built
            </label>
            <label className="fc chk">
              <input type="checkbox" /> Build periodically
            </label>
            <label className="fc chk">
              <input type="checkbox" defaultChecked /> Poll SCM
            </label>
            <label className="fc chk">
              <input type="checkbox" /> Disable this project
            </label>
          </div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="form"
          />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ Generic records (fallback) ══════════════ */
const RecordsLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const cap = capacityOf(app).perView;
  const [active, setActive] = useActive(0);
  return (
    <div className="app records" style={accentVar(v.accent)}>
      <AppTopBar v={v} search="Search records" />
      <div className="fr-body">
        <Nav v={v} n={8} active={active} onPick={setActive} cls="fr-side" />
        <main className="fr-main">
          <div className="crumb">
            {app.name} › {v.sec(active)}
          </div>
          <div className="filter-bar">
            <label>
              State
              <select aria-label="State">
                <option>All</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Closed</option>
              </select>
            </label>
            <label>
              Priority
              <select aria-label="Priority">
                <option>All</option>
                <option>Critical</option>
                <option>High</option>
                <option>Moderate</option>
                <option>Low</option>
              </select>
            </label>
            <ToolbarButtons v={v} n={3} />
          </div>
          <div className="list-head">
            {v.sec(active)} · showing {cap.valid} records
          </div>
          <CountedAttributes
            lab={v.lab(1)}
            valid={cap.valid}
            invalid={cap.invalid}
            appId={v.app.id}
            showPII={v.showPII}
            role={v.role}
            variant="table"
            select
          />
        </main>
      </div>
    </div>
  );
};

/* ══════════════ global action modal — the body designates the action ══════════════ */
type ActKind = "create" | "confirm" | "assign" | "export" | "comment" | "delete" | "details";
function actKind(t: string): ActKind {
  const s = t.toLowerCase();
  if (/(new|create|add|compose|schedule|draft|\bpo\b|book|raise)/.test(s)) return "create";
  if (/(delete|void|deny|reject|abort|remove|revert|decline|deactivate|suspend|disable)/.test(s)) return "delete";
  if (/(assign|reassign|escalate|owner|delegate|promote)/.test(s)) return "assign";
  if (/(export|download|extract|generate|bank file|payslip)/.test(s)) return "export";
  if (/(comment|note|reply|remind|mention|message|chat|ask)/.test(s)) return "comment";
  if (/(approve|resolve|close|submit|post|merge|finish|send|sign|release|acknowledge|convert|publish|pass|run|build|start|present|reimburse|pay)/.test(s))
    return "confirm";
  return "details";
}

export function ActionPanel({ app }: { app: AppDef }) {
  const { title } = usePanel();
  const v = useView(app);
  const cap = capacityOf(app).perView;
  if (!title) return null;
  const kind = actKind(title);
  const base = v.lab(3).base;
  const people = Array.from({ length: 5 }, (_, i) => pii("name", base + i * 3));

  let body: ReactNode;
  let confirmLabel = "Save";
  let confirmCls = "tbtn primary";

  switch (kind) {
    case "confirm":
      confirmLabel = title;
      body = (
        <div className="act-confirm">
          <div className="act-icon ok">✓</div>
          <div>
            <p>
              You’re about to <b>{title.toLowerCase()}</b> this record. Confirm the details below.
            </p>
            <div className="act-summary">
              <div className="act-sum-row">
                <span>Number</span>
                <b>{genValue("code", base)}</b>
              </div>
              <div className="act-sum-row">
                <span>Owner</span>
                <b>{pii("name", base + 1)}</b>
              </div>
              <div className="act-sum-row">
                <span>Status</span>
                <StatusPill text={genValue("status", base + 2)} />
              </div>
              <div className="act-sum-row">
                <span>Amount</span>
                <b>{pii("amount", base + 3)}</b>
              </div>
            </div>
          </div>
        </div>
      );
      break;
    case "assign":
      confirmLabel = "Assign";
      body = (
        <div className="act-form2">
          <label className="fc">
            <span>Assign to</span>
            <select aria-label="Assign to">
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="fc">
            <span>Assignment group</span>
            <select aria-label="Assignment group">
              <option>Service Desk</option>
              <option>Network</option>
              <option>Database</option>
              <option>Applications</option>
            </select>
          </label>
          <label className="fc">
            <span>Priority</span>
            <select aria-label="Priority">
              <option>1 - Critical</option>
              <option>2 - High</option>
              <option>3 - Moderate</option>
              <option>4 - Low</option>
            </select>
          </label>
          <label className="fc chk">
            <input type="checkbox" defaultChecked /> Notify assignee by email
          </label>
        </div>
      );
      break;
    case "export":
      confirmLabel = "Export";
      body = (
        <div className="act-form2">
          <fieldset className="fc radios">
            <legend>Format</legend>
            {["CSV", "XLSX", "PDF", "JSON"].map((o) => (
              <label className="radio" key={o}>
                <input type="radio" name="export-fmt" defaultChecked={o === "XLSX"} /> {o}
              </label>
            ))}
          </fieldset>
          <label className="fc">
            <span>Rows</span>
            <select aria-label="Rows">
              <option>Current view</option>
              <option>All records</option>
              <option>Selected only</option>
            </select>
          </label>
          <label className="fc chk">
            <input type="checkbox" defaultChecked /> Include column headers
          </label>
        </div>
      );
      break;
    case "comment":
      confirmLabel = "Post";
      body = (
        <div className="act-form2">
          <label className="fc">
            <span>Comment</span>
            <textarea aria-label="Comment" placeholder="Add your comment…" />
          </label>
          <label className="fc chk">
            <input type="checkbox" defaultChecked /> Notify watchers
          </label>
        </div>
      );
      break;
    case "delete":
      confirmLabel = title;
      confirmCls = "tbtn danger";
      body = (
        <div className="act-confirm">
          <div className="act-icon bad">!</div>
          <div>
            <p>
              This will <b>{title.toLowerCase()}</b> record <b>{genValue("code", base)}</b>. This
              action cannot be undone.
            </p>
          </div>
        </div>
      );
      break;
    case "create":
    default:
      confirmLabel = kind === "create" ? "Create" : "Save";
      body = (
        <CountedAttributes
          lab={v.lab(3)}
          valid={Math.min(cap.valid, 24)}
          invalid={0}
          appId={v.app.id}
          showPII={v.showPII}
          role={v.role}
          variant="form"
        />
      );
  }

  return (
    <div className="modal-scrim" onClick={closePanel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{title}</b>
          <span className="modal-kind">{kind}</span>
          <button className="modal-x" aria-label="Close" onClick={closePanel}>
            ✕
          </button>
        </div>
        <div className="modal-body">{body}</div>
        <div className="modal-foot">
          <button className="tbtn" onClick={closePanel}>
            Cancel
          </button>
          <button className={confirmCls} onClick={closePanel}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ dispatch ══════════════ */
const BY_ID: Record<string, FC<{ app: AppDef }>> = {
  outlook: MailLayout,
  teams: TeamsLayout,
  slack: SlackLayout,
  copilot: CopilotLayout,
  word: WordLayout,
  powerpoint: SlidesLayout,
  onenote: NoteLayout,
  wiki: WikiLayout,
  notion: WikiLayout,
  excel: ExcelLayout,
  jira: BoardLayout,
  asana: BoardLayout,
  servicenow: ServiceNowLayout,
  zendesk: ServiceNowLayout,
  pagerduty: ServiceNowLayout,
  sap: ServiceNowLayout,
  okta: ServiceNowLayout,
  crm: CrmLayout,
  testcase: TestCaseLayout,
  payroll: PayrollLayout,
  concur: PayrollLayout,
  insurance: InsuranceLayout,
  sharepoint: SharePointLayout,
  drive: SharePointLayout,
  hrms: HRMSLayout,
  workday: HRMSLayout,
  forms: FormsLayout,
  docusign: DocuSignLayout,
  zoom: ZoomLayout,
  azure: AzureLayout,
  tableau: DashboardLayout,
  monitoring: DashboardLayout,
  powerbi: DashboardLayout,
  kibana: DashboardLayout,
  git: RepoLayout,
  bitbucket: RepoLayout,
  jenkins: CiLayout,
  capturelab: ScenariosLayout,
};

export function getLayout(app: AppDef): FC<{ app: AppDef }> {
  return BY_ID[app.id] ?? RecordsLayout;
}
