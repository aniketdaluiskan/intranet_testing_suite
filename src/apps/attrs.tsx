import { useState, type ReactNode } from "react";
import { fieldLabel, type Labeler } from "../lib/labeler";
import { elId, elName, uid } from "../lib/ids";
import { genValue, controlFor, optionsFor, type ValueKind } from "../lib/pii";
import { pii } from "../lib/pii";
import { CONTROL_WORDS } from "../lib/controls";
import { schemaFor, commonIdValue } from "../lib/schemas";
import { sharedEntity } from "../lib/entities";
import { useSelection } from "./view";

/**
 * Renders the counted business attributes (valid label→value pairs + the
 * control-type-misID invalids) in an app-idiomatic SHAPE chosen by `variant`, so
 * each app's data region looks like the real product — a record list, a record
 * form, a chat stream, a spreadsheet grid or a kanban board — not a generic
 * field/checkbox table. Counts track BLOCK_CAP so the portal numbers hold.
 */
export type AttrVariant = "table" | "form" | "chat" | "cells" | "board" | "list";

export interface Item {
  label: string;
  value: string;
  id: string;
  name: string;
  kind: ValueKind;
}

/** A small set kept ALWAYS filled so downstream capture reliably has values. */
const STABLE_FILLED = new Set(["Policy Number", "Claim Status", "Number", "Status", "State"]);

/* ── value coercers so a control's default matches the field ── */
function dateOnly(v: string): string {
  const m = v.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
}
function numOnly(v: string): string {
  return v.replace(/[^0-9.]/g, "");
}

/** Inline status/priority pill (kept local so the engine is self-contained). */
function Pill({ text }: { text: string }) {
  const k = text.toLowerCase();
  const tone = /(open|active|\bnew\b|running|sent|triggered)/.test(k)
    ? "go"
    : /(closed|done|resolved|approved|complete|paid|merged)/.test(k)
      ? "ok"
      : /(reject|fail|denied|blocked|overdue|void)/.test(k)
        ? "bad"
        : /(pending|hold|progress|review|draft|waiting|submitted)/.test(k)
          ? "warn"
          : "neutral";
  return <span className={"pill pill-" + tone}>{text}</span>;
}

/** Build business-field items for bespoke layouts (Outlook etc.). */
export function fieldItems(appId: string, base: number, count: number, showPII: boolean): Item[] {
  return buildItems(base, count, showPII, appId);
}

/* ── the widget only (aria-labelled), for spreadsheet cells / inline edit ── */
export function ControlOnly({ item }: { item: Item }) {
  const ctrl = controlFor(item.kind);
  const opts = optionsFor(item.kind);
  const c = { id: item.id, name: item.name, "aria-label": item.label };
  switch (ctrl) {
    case "date":
      return <input {...c} type="date" defaultValue={dateOnly(item.value)} />;
    case "number":
      return <input {...c} type="number" defaultValue={numOnly(item.value)} />;
    case "email":
      return <input {...c} type="email" defaultValue={item.value} />;
    case "tel":
      return <input {...c} type="tel" defaultValue={item.value} />;
    case "textarea":
      return <textarea {...c} defaultValue={item.value} />;
    case "select":
      return (
        <select {...c} defaultValue={item.value}>
          {(opts || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return <input {...c} type="checkbox" defaultChecked={item.value === "Yes"} />;
    case "radio":
      return (
        <span className="radios" role="radiogroup" aria-label={item.label}>
          {(opts || []).map((o) => (
            <label key={o} className="radio">
              <input type="radio" name={item.name} value={o} defaultChecked={o === item.value} /> {o}
            </label>
          ))}
        </span>
      );
    default:
      return <input {...c} type="text" defaultValue={item.value} />;
  }
}

/* ── spreadsheet cell control: text or dropdown only (a real grid cell is never a
 * radio group, checkbox or calendar picker) ── */
function CellControl({ item }: { item: Item }) {
  const c = { id: item.id, name: item.name, "aria-label": item.label };
  const opts = optionsFor(item.kind);
  if (opts) {
    return (
      <select {...c} defaultValue={item.value} data-cap="valid" data-kind={item.kind} data-label={item.label}>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return <input {...c} type="text" defaultValue={item.value} data-cap="valid" data-kind={item.kind} data-label={item.label} />;
}

/* ── a fully-labelled field group (label[for] / fieldset+legend / wrapped checkbox) ── */
function FieldControl({ item }: { item: Item }) {
  const ctrl = controlFor(item.kind);
  if (ctrl === "checkbox") {
    return (
      <label className="fc chk" data-cap="valid" data-kind={item.kind} data-label={item.label}>
        <input id={item.id} name={item.name} type="checkbox" defaultChecked={item.value === "Yes"} />{" "}
        {item.label}
      </label>
    );
  }
  if (ctrl === "radio") {
    const opts = optionsFor(item.kind) || [];
    return (
      <fieldset className="fc radios" data-cap="valid" data-kind={item.kind} data-label={item.label}>
        <legend>{item.label}</legend>
        {opts.map((o) => (
          <label key={o} className="radio">
            <input type="radio" name={item.name} value={o} defaultChecked={o === item.value} /> {o}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <div className="fc" data-cap="valid" data-kind={item.kind} data-label={item.label}>
      <label htmlFor={item.id}>{item.label}</label>
      <ControlOnly item={item} />
    </div>
  );
}

// Value kinds assigned to freshly-generated (60%) labels so their values stay typed and varied.
const GEN_KINDS: ValueKind[] = [
  "text", "money", "status", "date", "name", "count", "priority", "email", "department", "percent", "code", "bool",
];

/**
 * Per-slot label + value-kind. ~40% of slots reuse a STABLE real schema label (deterministic per
 * slot -> recurs identically across every render), the other ~60% get a FRESHLY GENERATED English
 * label seeded from the churn base -> a new label on every navigation/click. The shared
 * case-reference Id is never a slot here -- it is rendered once as page context (see the
 * ``ctx-id`` chip), with a session-stable value from ``commonIdValue``.
 */
function slotField(appId: string, k: number, base: number): { label: string; kind: ValueKind } {
  const fields = schemaFor(appId).fields.filter((f) => !f.shared);
  if (k % 5 < 2) {
    const f = fields[k % fields.length];
    return { label: f.label, kind: f.kind }; // 40% -- stable, recurring business label
  }
  return { label: fieldLabel(base + k * 3 + 1), kind: GEN_KINDS[k % GEN_KINDS.length] }; // 60% -- generated
}

function buildItems(base: number, valid: number, showPII: boolean, appId: string): Item[] {
  const out: Item[] = [];
  for (let k = 0; k < valid; k++) {
    const { label, kind } = slotField(appId, k, base);
    const i = 2000 + k;
    const filled = showPII && (STABLE_FILLED.has(label) || (k + base) % 2 === 0);
    // Name/email draw from the session-stable cross-app roster so the same people recur across apps
    // (entity-resolution surface); every other kind regenerates with the churn base.
    const value = filled
      ? kind === "name"
        ? sharedEntity(k).name
        : kind === "email"
          ? sharedEntity(k).email
          : genValue(kind, base + i)
      : "";
    out.push({ label, value, id: elId(base, i, "f"), name: elName(base, i), kind });
  }
  return out;
}

export function InvalidZone({ count }: { count: number }) {
  return (
    <ul className="invalid-zone" title="non-value controls (control-type misID)">
      {Array.from({ length: count }, (_, i) => {
        const w = CONTROL_WORDS[i % CONTROL_WORDS.length];
        const cap = { "data-cap": "invalid", "data-kind": "misID", "data-label": w } as const;
        switch (i % 5) {
          case 0:
            return (
              <button key={i} className="misid" {...cap}>
                {w}
              </button>
            );
          case 1:
            return (
              <strong key={i} className="misid" {...cap}>
                {w}
              </strong>
            );
          case 2:
            return (
              <span key={i} className="misid" role="columnheader" {...cap}>
                {w}
              </span>
            );
          case 3:
            return (
              <li key={i} className="misid" role="menuitem" {...cap}>
                {w}
              </li>
            );
          default:
            return (
              <a key={i} className="misid" href="#" onClick={(e) => e.preventDefault()} {...cap}>
                {w}
              </a>
            );
        }
      })}
    </ul>
  );
}

/** Cell content for a record grid: pills for status/priority, plain text else. */
function cellContent(kind: ValueKind, value: string): ReactNode {
  if (!value) return null;
  if (kind === "status" || kind === "priority") return <Pill text={value} />;
  return value;
}

export function CountedAttributes({
  lab,
  appId,
  valid,
  invalid,
  showPII,
  variant = "form",
  select = false,
}: {
  lab: Labeler;
  appId: string;
  valid: number;
  invalid: number;
  showPII: boolean;
  role?: "process" | "nonprocess" | "extra";
  variant?: AttrVariant;
  select?: boolean;
}) {
  const items = buildItems(lab.base, valid, showPII, appId);
  const allFields = schemaFor(appId).fields;
  const sharedField = allFields.find((f) => f.shared);
  const sharedId = commonIdValue(appId, 0) || commonIdValue(appId, 1);
  // Same 40%-stable / 60%-generated rule for record-grid column headers.
  const tableCols = Array.from({ length: 9 }, (_, c) => slotField(appId, c, lab.base));
  const tableRowCount = Math.max(1, Math.ceil(valid / tableCols.length));
  const tableSel = useSelection(tableRowCount);
  const [boardCols, setBoardCols] = useState<Record<string, number>>({});

  let body: ReactNode;
  switch (variant) {
    /* ── real record list (ServiceNow / records / test / dashboards) ── */
    case "table": {
      body = (
        <div className="rec-scroll">
          <table className="rec-grid">
            <thead>
              <tr>
                {select && (
                  <th className="chk">
                    <input
                      type="checkbox"
                      id={`allcheck_${uid(lab.base)}`}
                      name="allcheck"
                      aria-label="Select all"
                      checked={tableSel.allChecked}
                      onChange={tableSel.toggleAll}
                    />
                  </th>
                )}
                {tableCols.map((c, ci) => (
                  <th key={ci} scope="col">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: tableRowCount }, (_, r) => (
                <tr key={r} className={select && tableSel.isChecked(r) ? "sel" : ""}>
                  {select && (
                    <td className="chk">
                      <input
                        type="checkbox"
                        aria-label={`Select row ${r + 1}`}
                        checked={tableSel.isChecked(r)}
                        onChange={() => tableSel.toggle(r)}
                      />
                    </td>
                  )}
                  {tableCols.map((c, ci) => {
                    const k = r * tableCols.length + ci;
                    const stable = STABLE_FILLED.has(c.label);
                    const filled = showPII && (stable || (k + lab.base) % 2 === 0);
                    const val = filled ? genValue(c.kind, lab.base + 3000 + k) : "";
                    const num = c.kind === "money" || c.kind === "percent" || c.kind === "count";
                    return (
                      <td key={ci} className={num ? "num" : ""} data-cap="valid" data-kind={c.kind} data-label={c.label}>
                        {cellContent(c.kind, val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      break;
    }

    /* ── sectioned record form (CRM / Insurance / HRMS / Azure / …) ── */
    case "form": {
      const SEC = ["General", "Details", "Classification", "Dates & Owners", "Financials", "Additional", "Metadata", "References"];
      const perSec = 9;
      const groups: Item[][] = [];
      for (let i = 0; i < items.length; i += perSec) groups.push(items.slice(i, i + perSec));
      body = (
        <div className="v-form">
          {groups.map((g, s) => (
            <fieldset className="form-sec" key={s}>
              <legend>{SEC[s % SEC.length]}</legend>
              <div className="form-sec-grid">
                {g.map((it) => (
                  <FieldControl key={it.id} item={it} />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      );
      break;
    }

    /* ── message stream (Copilot / Teams / Slack) ── */
    case "chat": {
      body = (
        <div className="v-chat">
          {items.map((it, i) => {
            const me = i % 4 === 0;
            const nm = pii("name", lab.base + i);
            const initials = nm.split(" ").map((s) => s[0]).join("").slice(0, 2);
            const hh = String(((lab.base + i * 7) % 12) + 1).padStart(2, "0");
            const mm = String((lab.base + i * 13) % 60).padStart(2, "0");
            return (
              <div className={"chatmsg" + (me ? " me" : "")} key={it.id}>
                <span className="avatar sm chat-av">{initials}</span>
                <div className="chatmsg-body">
                  <div className="chatmsg-head">
                    <b>{me ? "You" : nm}</b> <span className="chatmsg-time">{hh}:{mm}</span>
                  </div>
                  <div className="chatmsg-text">
                    <span className="kv-k">{it.label}:</span>{" "}
                    <span className="kv-v">{it.value || genValue(it.kind, lab.base + i * 3 + 7)}</span>
                  </div>
                  {i % 5 === 0 && (
                    <div className="chatmsg-reacts">
                      <span>👍 {(i % 4) + 1}</span>
                      <span>✅ {(i % 3) + 1}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
      break;
    }

    /* ── spreadsheet grid (Excel) ── */
    case "cells": {
      // A real spreadsheet is wide and tall with data in the top-left and empty cells beyond. COLS
      // sets the visible columns (A..); the populated `items` fill row-major, then the grid is padded
      // with authentic EMPTY cells down to ROWS. Empty cells add grid size (what "more rows/columns"
      // means) WITHOUT adding typed fields — only the populated cells are real inputs to capture.
      const COLS = 20;
      const colName = (i: number) => {
        let n = i + 1;
        let s = "";
        while (n > 0) {
          const m = (n - 1) % 26;
          s = String.fromCharCode(65 + m) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      };
      const dataRows = Math.ceil(items.length / COLS);
      const ROWS = Math.max(dataRows + 6, 28); // always leave an empty tail so it reads like a real sheet
      body = (
        <div className="sheet-scroll">
          <table className="v-cells">
            <thead>
              <tr>
                <th className="corner" scope="col"></th>
                {Array.from({ length: COLS }, (_, c) => (
                  <th key={c} className="collet" scope="col">
                    {colName(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <th className="rownum" scope="row">
                    {r + 1}
                  </th>
                  {Array.from({ length: COLS }, (_, c) => {
                    const idx = r * COLS + c;
                    const it = idx < items.length ? items[idx] : null;
                    return it ? (
                      <td key={it.id}>
                        <CellControl item={it} />
                      </td>
                    ) : (
                      <td key={"e" + r + "-" + c} className="v-cell-e" />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      break;
    }

    /* ── note lines with occasional to-dos (OneNote) ── */
    case "list": {
      body = (
        <ul className="v-notes">
          {items.map((it, i) => (
            <li key={it.id} className="note-line">
              {i % 3 === 0 ? (
                <label className="note-todo">
                  <input type="checkbox" defaultChecked={i % 6 === 0} aria-label={it.label} />
                  <span className="li-label">{it.label}</span>
                </label>
              ) : (
                <span className="li-label bullet">{it.label}</span>
              )}
              {it.value && <span className="li-value">{it.value}</span>}
            </li>
          ))}
        </ul>
      );
      break;
    }

    /* ── kanban board with real issue cards (Jira / Asana) ── */
    case "board": {
      const COLNAMES = ["Backlog", "To Do", "In Progress", "Review", "Done"];
      const key = appId.slice(0, 3).toUpperCase();
      const placed = items.map((it, i) => ({ it, i, c: boardCols[it.id] ?? i % COLNAMES.length }));
      body = (
        <div className="board-cols">
          {COLNAMES.map((cn, c) => (
            <div
              className="bcol"
              key={c}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/plain");
                if (id) setBoardCols((m) => ({ ...m, [id]: c }));
              }}
            >
              <div className="bcol-title">
                {cn} <span className="bcol-count">{placed.filter((p) => p.c === c).length}</span>
              </div>
              {placed
                .filter((p) => p.c === c)
                .map(({ it, i }) => {
                  const nm = pii("name", lab.base + i);
                  const initials = nm.split(" ").map((s) => s[0]).join("").slice(0, 2);
                  return (
                    <div
                      className="bcard"
                      key={it.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)}
                    >
                      <div className="bcard-summary">
                        <span className="kv-k">{it.label}:</span> {it.value || "—"}
                      </div>
                      <div className="bcard-foot">
                        <span className={"btype t" + (i % 3)} title={["Story", "Bug", "Task"][i % 3]} />
                        <span className="bcard-key">
                          {key}-{100 + i}
                        </span>
                        <span className="bcard-pts">{(i % 8) + 1}</span>
                        <span className="avatar sm" title={nm}>
                          {initials}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      );
      break;
    }

    default:
      body = null;
  }

  return (
    <form className="counted" onSubmit={(e) => e.preventDefault()}>
      {sharedField && sharedId && (
        <div className="ctx-id" title="Case reference — shared across applications">
          <span className="kv-k">{sharedField.label}</span>
          <span className="kv-v mono">{sharedId}</span>
        </div>
      )}
      {body}
      <InvalidZone count={invalid} />
    </form>
  );
}
