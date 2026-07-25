import { useEffect, useRef, useState, type FC, type ReactElement } from "react";
import { accentVar, useActive, useView, type View } from "./view";
import type { AppDef } from "./registry";
import { genValue } from "../lib/pii";
import { schemaFor } from "../lib/schemas";
import { hostFor } from "../lib/hosts";

/**
 * Capture Lab — advanced DOM-capture edge cases a real capture agent must handle:
 * nested iframes (multi-level, same-origin srcdoc), open Shadow DOM (nested
 * roots), parent⇄iframe postMessage, and deep/large DOM. Every scenario is
 * populated with real label→value fields so the capture surface is exercised
 * ACROSS each frame / shadow / nesting boundary — the whole point of the lab.
 */

const rand = () => Math.floor(Math.random() * 100000);

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** Escape a full HTML document so it can be embedded in a srcdoc="…" attribute. */
function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** A block of label→value fields as an HTML string (for iframes & shadow roots). */
function fieldsHtml(appId: string, seed: number, n: number): string {
  const fs = schemaFor(appId).fields.filter((f) => !f.shared);
  let h = '<div class="lab-grid">';
  for (let i = 0; i < n; i++) {
    const f = fs[(seed + i) % fs.length];
    const val = escHtml(genValue(f.kind, seed + i * 7));
    const id = `lab_${seed}_${i}`;
    h +=
      `<div class="lab-fc"><label for="${id}">${escHtml(f.label)}</label>` +
      `<input id="${id}" name="${id}" value="${val}" /></div>`;
  }
  return h + "</div>";
}

function frameCss(accent: string): string {
  return (
    "body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:10px;color:#1f2430;background:#fff}" +
    ".lab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}" +
    ".lab-fc{display:flex;flex-direction:column;gap:2px}" +
    ".lab-fc label{font-size:11px;color:#6b7280}" +
    ".lab-fc input{border:1px solid #e5e7eb;border-radius:5px;padding:5px 7px;font-size:12.5px;width:100%;box-sizing:border-box}" +
    `.frame-wrap{border:2px solid ${accent};border-radius:8px;padding:10px;margin-top:8px}` +
    `.frame-h{font-size:12px;font-weight:700;margin-bottom:8px;color:${accent}}` +
    ".sd-h{font-size:12px;font-weight:700;margin:2px 0 8px}" +
    "iframe{width:100%;border:0;background:#fafbfc}"
  );
}

/** Recursive nested-iframe document (same-origin srcdoc). */
function frameDoc(appId: string, depth: number, seed: number, accent: string): string {
  const inner =
    depth > 1
      ? `<iframe title="Nested frame level ${depth - 1}" height="${Math.max(180, 150 * (depth - 1))}" srcdoc="${escAttr(
          frameDoc(appId, depth - 1, seed + 137, accent),
        )}"></iframe>`
      : "";
  return (
    `<!doctype html><html><head><style>${frameCss(accent)}</style></head><body>` +
    `<div class="frame-wrap"><div class="frame-h">Frame level ${depth} · ${appId}.corp.acme.local</div>` +
    fieldsHtml(appId, seed, 6) +
    inner +
    `</div></body></html>`
  );
}

/* ── Scenario 1: nested iframes ── */
function NestedIframes({ v }: { v: View }) {
  const [levels, setLevels] = useState(3);
  const [seed, setSeed] = useState(rand);
  return (
    <div className="lab-scenario">
      <div className="lab-controls">
        <label>
          Nesting depth
          <select value={levels} onChange={(e) => setLevels(Number(e.target.value))}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n} level{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="tbtn" onClick={() => setSeed(rand())}>
          Regenerate
        </button>
        <span className="lab-note">
          Same-origin <code>srcdoc</code> iframes, {levels} levels deep — each frame carries its own
          label→value fields.
        </span>
      </div>
      <iframe
        className="lab-frame"
        title="Nested iframes scenario"
        srcDoc={frameDoc(v.app.id, levels, seed, v.accent)}
      />
    </div>
  );
}

/* ── Scenario 2: nested open Shadow DOM ── */
function ShadowScenario({ v }: { v: View }) {
  const [levels, setLevels] = useState(4);
  const [seed, setSeed] = useState(rand);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.replaceChildren();
    let host: HTMLElement = document.createElement("div");
    root.appendChild(host);
    for (let l = 1; l <= levels; l++) {
      let sr: ShadowRoot | null = null;
      try {
        sr = host.attachShadow({ mode: "open" });
      } catch {
        break;
      }
      if (!sr) break;
      const style = document.createElement("style");
      style.textContent = frameCss(v.accent);
      sr.appendChild(style);
      const box = document.createElement("div");
      box.className = "frame-wrap";
      box.innerHTML =
        `<div class="sd-h">Shadow root level ${l} (open) · ${v.app.id}</div>` +
        fieldsHtml(v.app.id, seed + l * 10, 5);
      sr.appendChild(box);
      const next = document.createElement("div");
      box.appendChild(next);
      host = next;
    }
  }, [levels, seed, v.app.id, v.accent]);
  return (
    <div className="lab-scenario">
      <div className="lab-controls">
        <label>
          Shadow nesting
          <select value={levels} onChange={(e) => setLevels(Number(e.target.value))}>
            {[1, 2, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} level{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="tbtn" onClick={() => setSeed(rand())}>
          Regenerate
        </button>
        <span className="lab-note">
          Open shadow roots nested {levels} deep — fields live inside each shadow boundary.
        </span>
      </div>
      <div className="lab-shadow" ref={ref} />
    </div>
  );
}

/* ── Scenario 3: parent ⇄ iframe postMessage ── */
function PostMessageScenario({ v }: { v: View }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [seed] = useState(rand);
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { from?: string; echo?: unknown };
      if (d && d.from === "iframe") {
        setLog((L) => [`↩ iframe replied: ${JSON.stringify(d.echo)}`, ...L].slice(0, 8));
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const send = () => {
    const payload = { type: "capture-ping", id: `CS-${100000 + (seed % 99999)}`, at: Date.now() };
    iframeRef.current?.contentWindow?.postMessage(payload, "*");
    setLog((L) => [`→ sent: ${JSON.stringify(payload)}`, ...L].slice(0, 8));
  };
  const doc =
    `<!doctype html><html><head><style>${frameCss(v.accent)}</style></head><body>` +
    `<div class="frame-wrap"><div class="frame-h">Embedded iframe — listens for postMessage</div>` +
    fieldsHtml(v.app.id, seed + 3, 5) +
    `<div id="st" style="font-size:12px;color:#6b7280;margin-top:8px">Waiting for messages…</div></div>` +
    `<script>window.addEventListener('message',function(e){var s=document.getElementById('st');` +
    `if(s)s.textContent='Received: '+JSON.stringify(e.data);` +
    `parent.postMessage({from:'iframe',echo:e.data},'*');});<\/script></body></html>`;
  return (
    <div className="lab-scenario">
      <div className="lab-controls">
        <button className="tbtn primary" onClick={send}>
          Send postMessage → iframe
        </button>
        <span className="lab-note">
          Parent ⇄ iframe messaging (popup-modal pattern). Fields inside the iframe are captured
          across the frame boundary.
        </span>
      </div>
      <iframe ref={iframeRef} className="lab-frame short" title="postMessage target" srcDoc={doc} />
      <div className="lab-log">
        {log.length === 0 ? <div className="lab-log-empty">No messages yet.</div> : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

/* ── Scenario 4: deep / large DOM ── */
function DeepDom({ v }: { v: View }) {
  const [depth, setDepth] = useState(25);
  const fs = schemaFor(v.app.id).fields.filter((f) => !f.shared);
  function build(d: number): ReactElement | null {
    if (d <= 0) return null;
    const f = fs[(depth - d) % fs.length];
    const id = `deep_${d}`;
    return (
      <div className="deep-node">
        <span className="deep-lvl">L{depth - d + 1}</span>
        <label htmlFor={id}>{f.label}</label>
        <input id={id} name={id} defaultValue={genValue(f.kind, d * 3 + 11)} />
        {build(d - 1)}
      </div>
    );
  }
  return (
    <div className="lab-scenario">
      <div className="lab-controls">
        <label>
          Nesting depth
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
            {[10, 25, 50, 80].map((n) => (
              <option key={n} value={n}>
                {n} levels
              </option>
            ))}
          </select>
        </label>
        <span className="lab-note">
          {depth} levels of nested DOM, each with a label→value field (deep screen-text capture).
        </span>
      </div>
      <div className="deep-root">{build(depth)}</div>
    </div>
  );
}

export const ScenariosLayout: FC<{ app: AppDef }> = ({ app }) => {
  const v = useView(app);
  const [tab, setTab] = useActive(0);
  const tabs = ["Nested Iframes", "Shadow DOM", "PostMessage", "Deep DOM"];
  return (
    <div className="app scenarios" style={accentVar(v.accent)}>
      <header className="app-top" style={{ background: v.accent }}>
        <button className="home-dot" onClick={v.goHome} title="Acme Intranet">
          ⌂
        </button>
        <span className="app-mono">{v.app.monogram}</span>
        <b className="app-title">{v.app.name}</b>
        <span className="app-url">🔒 {hostFor(v.app.id)}</span>
      </header>
      <div className="ribbon-tabs">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={"rtab" + (i === tab ? " on" : "")}
            onClick={() => {
              setTab(i);
              v.goView(t, i);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <main className="lab-main">
        <div className="lab-intro">
          Advanced capture scenarios — the DOM structures a capture agent must traverse. Every frame,
          shadow root and nested node carries real label→value fields.
        </div>
        {tab === 0 && <NestedIframes v={v} />}
        {tab === 1 && <ShadowScenario v={v} />}
        {tab === 2 && <PostMessageScenario v={v} />}
        {tab === 3 && <DeepDom v={v} />}
      </main>
    </div>
  );
};
