import { useState, type ReactNode } from "react";
import { type Labeler } from "../lib/labeler";
import { elId, elName, uid } from "../lib/ids";
import { genValue, controlFor, optionsFor, type ValueKind } from "../lib/pii";
import { CONTROL_WORDS } from "../lib/controls";
import { schemaFor, commonIdValue } from "../lib/schemas";
import { useSelection } from "./view";

/**
 * Renders the SAME counted attributes (valid label→value pairs with churned
 * labels, synthetic PII, unique ids, + process shared vocabulary) and the
 * control-type-misID invalids — but in an app-idiomatic shape chosen by
 * `variant`, so each app's data region looks native. Counts equal BLOCK_CAP so
 * the capacity target is preserved. Values are prefilled (editable) when PII is on.
 */
export type AttrVariant =
  | "grid"
  | "props"
  | "rows"
  | "cells"
  | "list"
  | "cards"
  | "bubbles"
  | "board";

export interface Item {
  label: string;
  value: string;
  id: string;
  name: string;
  kind: ValueKind;
}

/** A small set kept ALWAYS filled so downstream capture reliably has values
 * to work with (a common capture tip). Present in every app because
 * Number/Status/State are chrome fields. */
const STABLE_FILLED = new Set(["Policy Number", "Claim Status", "Number", "Status", "State"]);

/* ── value coercers so a control's default matches the field ── */
function dateOnly(v: string): string {
  const m = v.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
}
function numOnly(v: string): string {
  return v.replace(/[^0-9.]/g, "");
}

/** Build business-field items for bespoke layouts (Excel/Outlook/Jira). */
export function fieldItems(appId: string, base: number, count: number, showPII: boolean): Item[] {
  return buildItems(base, count, showPII, appId);
}

/* ── the widget only (aria-labelled), for table/spreadsheet cells ── */
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

function buildItems(
  base: number,
  valid: number,
  showPII: boolean,
  appId: string,
): Item[] {
  const fields = schemaFor(appId).fields;
  const out: Item[] = [];
  for (let k = 0; k < valid; k++) {
    const fdef = fields[k % fields.length]; // real business field, repeats like production
    const i = 2000 + k;
    // ~half the inputs are left EMPTY on purpose: an empty input next to a valid
    // label is the "empty label→value" path a capture pipeline may keep as an
    // empty reference (a major bloat axis). The `+ base` makes a given label
    // appear BOTH filled and empty across screens, so empty-only labels still get
    // a filled sibling (which links the text field). A stable set stays filled so
    // downstream capture always has something to work with.
    const stable = STABLE_FILLED.has(fdef.label);
    const filled = showPII && (stable || (k + base) % 2 === 0);
    // shared Id keeps the SAME value across apps (case-stitching); others mix empty/filled
    const value = fdef.shared
      ? commonIdValue(appId, k)
      : filled
        ? genValue(fdef.kind, base + i)
        : "";
    out.push({
      label: fdef.label,
      value,
      id: elId(base, i, "f"),
      name: elName(base, i),
      kind: fdef.kind,
    });
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

export function CountedAttributes({
  lab,
  appId,
  valid,
  invalid,
  showPII,
  variant = "grid",
}: {
  lab: Labeler;
  appId: string;
  valid: number;
  invalid: number;
  showPII: boolean;
  role?: "process" | "noise" | "extra";
  variant?: AttrVariant;
}) {
  const items = buildItems(lab.base, valid, showPII, appId);
  const sel = useSelection(items.length);
  const [boardCols, setBoardCols] = useState<Record<string, number>>({});

  let body: ReactNode;
  switch (variant) {
    case "props":
      body = (
        <div className="v-props">
          {items.map((it) => (
            <FieldControl key={it.id} item={it} />
          ))}
        </div>
      );
      break;
    case "rows":
      body = (
        <table className="v-rows">
          <thead>
            <tr>
              <th className="chk">
                {/* real working select-all; keeps the ServiceNow allcheck_ marker */}
                <input
                  type="checkbox"
                  id={`allcheck_${uid(lab.base)}`}
                  name="allcheck"
                  aria-label="Select all"
                  checked={sel.allChecked}
                  onChange={sel.toggleAll}
                />
              </th>
              <th scope="col">Field</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className={sel.isChecked(i) ? "sel" : ""}>
                <td className="chk">
                  <input type="checkbox" aria-label={`Select ${it.label}`} checked={sel.isChecked(i)} onChange={() => sel.toggle(i)} />
                </td>
                <td>
                  <label htmlFor={it.id}>{it.label}</label>
                </td>
                <td>
                  <ControlOnly item={it} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;
    case "cells": {
      // real spreadsheet: A–Z column letters (frozen top) + row numbers (frozen left)
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
    case "list":
      body = (
        <ul className="v-list">
          <li className="v-list-all">
            <input
              type="checkbox"
              id={`allcheck_${uid(lab.base + 1)}`}
              name="allcheck"
              aria-label="Select all"
              checked={sel.allChecked}
              onChange={sel.toggleAll}
            />
            <span>Select all</span>
          </li>
          {items.map((it, i) => (
            <li key={it.id} className={sel.isChecked(i) ? "sel" : ""}>
              <input type="checkbox" checked={sel.isChecked(i)} onChange={() => sel.toggle(i)} />
              <span className="li-label">{it.label}</span>
              <span className="li-value">{it.value}</span>
            </li>
          ))}
        </ul>
      );
      break;
    case "cards":
      body = (
        <div className="v-cards">
          {items.map((it) => (
            <div className="v-card" key={it.id}>
              <FieldControl item={it} />
            </div>
          ))}
        </div>
      );
      break;
    case "bubbles":
      body = (
        <div className="v-bubbles">
          {items.map((it) => (
            <div className="v-turn" key={it.id}>
              <div className="bubble user">{it.label}</div>
              <div className="bubble bot">{it.value || "…"}</div>
            </div>
          ))}
        </div>
      );
      break;
    case "board": {
      const COLNAMES = ["Backlog", "To Do", "In Progress", "Review", "Done"];
      const placed = items.map((it, i) => ({
        it,
        c: boardCols[it.id] ?? i % COLNAMES.length,
      }));
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
                .map(({ it }) => (
                  <div
                    className="bcard"
                    key={it.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)}
                  >
                    <span className="bcard-label">{it.label}</span>
                    <ControlOnly item={it} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      );
      break;
    }
    default:
      body = (
        <div className="v-grid">
          {items.map((it) => (
            <FieldControl key={it.id} item={it} />
          ))}
        </div>
      );
  }

  return (
    <form className="counted" onSubmit={(e) => e.preventDefault()}>
      {body}
      <InvalidZone count={invalid} />
    </form>
  );
}
