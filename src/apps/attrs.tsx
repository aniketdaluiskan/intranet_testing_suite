import { useState, type ReactNode } from "react";
import { type Labeler } from "../lib/labeler";
import { elId, elName, uid } from "../lib/ids";
import { genValue, controlFor, optionsFor, type ValueKind } from "../lib/pii";
import { pii } from "../lib/pii";
import { CONTROL_WORDS } from "../lib/controls";
import { schemaFor, commonIdValue } from "../lib/schemas";
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

/* ── a fully-labelled field group (label[for] / fieldset+legend / wrapped checkbox) ── */
function FieldControl({ item }: { item: Item }) {
  const ctrl = controlFor(item.kind);
  if (ctrl === "checkbox") {
    return (
      <label className="fc chk">
        <input id={item.id} name={item.name} type="checkbox" defaultChecked={item.value === "Yes"} />{" "}
        {item.label}
      </label>
    );
  }
  if (ctrl === "radio") {
    const opts = optionsFor(item.kind) || [];
    return (
      <fieldset className="fc radios">
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
    <div className="fc">
      <label htmlFor={item.id}>{item.label}</label>
      <ControlOnly item={item} />
    </div>
  );
}

function buildItems(base: number, valid: number, showPII: boolean, appId: string): Item[] {
  const fields = schemaFor(appId).fields;
  const out: Item[] = [];
  for (let k = 0; k < valid; k++) {
    const fdef = fields[k % fields.length];
    const i = 2000 + k;
    const stable = STABLE_FILLED.has(fdef.label);
    const filled = showPII && (stable || (k + base) % 2 === 0);
    const value = fdef.shared
      ? commonIdValue(appId, k)
      : filled
        ? genValue(fdef.kind, base + i)
        : "";
    out.push({ label: fdef.label, value, id: elId(base, i, "f"), name: elName(base, i), kind: fdef.kind });
  }
  return out;
}

export function InvalidZone({ count }: { count: number }) {
  return (
    <ul className="invalid-zone" title="non-value controls (control-type misID)">
      {Array.from({ length: count }, (_, i) => {
        const w = CONTROL_WORDS[i % CONTROL_WORDS.length];
        switch (i % 5) {
          case 0:
            return (
              <button key={i} className="misid">
                {w}
              </button>
            );
          case 1:
            return (
              <strong key={i} className="misid">
                {w}
              </strong>
            );
          case 2:
            return (
              <span key={i} className="misid" role="columnheader">
                {w}
              </span>
            );
          case 3:
            return (
              <li key={i} className="misid" role="menuitem">
                {w}
              </li>
            );
          default:
            return (
              <a key={i} className="misid" href="#" onClick={(e) => e.preventDefault()}>
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
  role?: "process" | "noise" | "extra";
  variant?: AttrVariant;
  select?: boolean;
}) {
  const items = buildItems(lab.base, valid, showPII, appId);
  const fields = schemaFor(appId).fields;
  const tableCols = fields.slice(0, 9);
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
                {tableCols.map((c) => (
                  <th key={c.label} scope="col">
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
                    const val = c.shared
                      ? commonIdValue(appId, r)
                      : filled
                        ? genValue(c.kind, lab.base + 3000 + k)
                        : "";
                    const num = c.kind === "money" || c.kind === "percent" || c.kind === "count";
                    return (
                      <td key={ci} className={num ? "num" : ""}>
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
            const text = it.value ? `${it.label}: ${it.value}` : it.label;
            return (
              <div className={"chatmsg" + (me ? " me" : "")} key={it.id}>
                <span className="avatar sm chat-av">{initials}</span>
                <div className="chatmsg-body">
                  <div className="chatmsg-head">
                    <b>{me ? "You" : nm}</b> <span className="chatmsg-time">{hh}:{mm}</span>
                  </div>
                  <div className="chatmsg-text">{text}</div>
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
      const COLS = 12;
      const letters = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));
      const rows: Item[][] = [];
      for (let i = 0; i < items.length; i += COLS) rows.push(items.slice(i, i + COLS));
      body = (
        <div className="sheet-scroll">
          <table className="v-cells">
            <thead>
              <tr>
                <th className="corner" scope="col"></th>
                {letters.map((l) => (
                  <th key={l} className="collet" scope="col">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  <th className="rownum" scope="row">
                    {r + 1}
                  </th>
                  {row.map((it) => (
                    <td key={it.id}>
                      <ControlOnly item={it} />
                    </td>
                  ))}
                  {row.length < COLS &&
                    Array.from({ length: COLS - row.length }, (_, k) => <td key={"pad" + k} />)}
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
                      <div className="bcard-summary">{it.value ? `${it.label}: ${it.value}` : it.label}</div>
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
      {body}
      <InvalidZone count={invalid} />
    </form>
  );
}
