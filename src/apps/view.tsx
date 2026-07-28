import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "../router";
import { useChurnTick, useStore } from "../store";
import { makeLabeler, type Labeler } from "../lib/labeler";
import { itemPath, viewPath } from "../lib/churn";
import { appRole } from "../lib/controls";
import { schemaFor, type Schema } from "../lib/schemas";
import { genValue } from "../lib/pii";
import { multiPort, portalOrigin } from "../lib/ports";
import { openPanel, closePanel } from "./panel";
import type { AppDef } from "./registry";

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pretty(s: string): string {
  return s ? s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}

/** Inline style setting the --accent CSS variable (typed for React). */
export function accentVar(c: string): CSSProperties {
  return { "--accent": c } as CSSProperties;
}

export interface View {
  app: AppDef;
  tick: number;
  role: "process" | "nonprocess" | "extra";
  showPII: boolean;
  accent: string;
  viewName: string;
  lab: (salt: number) => Labeler;
  sec: (i: number) => string; // meaningful nav/section name
  act: (i: number) => string; // meaningful action/button label
  fld: (i: number) => string; // meaningful business field label
  go: (label: string, i: number) => void; // open an item (deep churned URL)
  goView: (label: string, i: number) => void; // open a section/view
  goHome: () => void;
}

function wrap(arr: string[], i: number): string {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

/** Business query params (?PolicyNumber=..&ClaimStatus=..) → url-source attributes. */
function bizQuery(schema: Schema, tick: number): string {
  const fs = schema.fields;
  const parts: string[] = [];
  for (let k = 0; k < 3; k++) {
    const fd = fs[(Math.abs(tick) + k * 5) % fs.length];
    const key = fd.label.replace(/[^A-Za-z0-9]/g, "");
    parts.push(`${key}=${encodeURIComponent(genValue(fd.kind, tick + k))}`);
  }
  return "?" + parts.join("&");
}

/** Shared per-app view state. Sets the document title from the current route so
 * the tab title changes as you move around, and exposes churning navigation. */
export function useView(app: AppDef): View {
  const navigate = useNavigate();
  const tick = useChurnTick();
  const { settings } = useStore();
  const params = useParams();
  const splat = params["*"] || "";
  const seg = splat.split("/").filter(Boolean);
  const viewName = pretty(seg[1] || seg[0] || "") || "Home";

  useEffect(() => {
    document.title = `${viewName} · ${app.name} — Acme`;
  }, [viewName, app.name]);

  // A fresh, app-relatable page title on EVERY click, anywhere. Safe to do per click (unlike DOM
  // churn): it only writes document.title — no React re-render, no re-mount — so it never wipes the
  // sweep's data-swept marks. The fragment is drawn from THIS app's own sections/actions so it
  // stays relatable to the launched app (e.g. "Create Incident · ServiceNow — Acme").
  useEffect(() => {
    const s = schemaFor(app.id);
    const pool = [...s.sections, ...s.actions].filter(Boolean);
    if (pool.length === 0) return;
    let last = "";
    const onClick = () => {
      let frag = pool[(Math.random() * pool.length) | 0];
      if (pool.length > 1 && frag === last) frag = pool[(pool.indexOf(frag) + 1) % pool.length];
      last = frag;
      document.title = `${frag} · ${app.name} — Acme`;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [app.id, app.name]);

  const saltBase = hashStr(app.id) % 100000;
  const schema = schemaFor(app.id);
  return {
    app,
    tick,
    role: appRole(app.id),
    showPII: settings.showPII,
    accent: app.accent,
    viewName,
    lab: (salt: number) => makeLabeler(tick, saltBase + salt),
    sec: (i) => wrap(schema.sections, i),
    act: (i) => wrap(schema.actions, i),
    fld: (i) => schema.fields[((i % schema.fields.length) + schema.fields.length) % schema.fields.length].label,
    go: (label, i) => {
      navigate(itemPath(app.id, "item", label, tick, i) + bizQuery(schema, tick + i));
      openPanel(label); // opening a record/action shows a detail form
    },
    goView: (label, i) => navigate(viewPath(app.id, label, tick, i) + bizQuery(schema, tick + i)),
    goHome: () => {
      closePanel();
      if (multiPort()) window.location.href = portalOrigin();
      else navigate("/");
    },
  };
}

/** Working multi-select (select-all actually selects every row). */
export function useSelection(n: number) {
  const [set, setSet] = useState<Set<number>>(() => new Set());
  const allChecked = n > 0 && set.size === n;
  return {
    isChecked: (i: number) => set.has(i),
    toggle: (i: number) =>
      setSet((s) => {
        const x = new Set(s);
        x.has(i) ? x.delete(i) : x.add(i);
        return x;
      }),
    allChecked,
    toggleAll: () =>
      setSet(allChecked ? new Set() : new Set(Array.from({ length: n }, (_, i) => i))),
    count: set.size,
  };
}

/** Active index for tab strips / nav rails / sheet tabs. */
export function useActive(init = 0): [number, (i: number) => void] {
  const [active, setActive] = useState(init);
  return [active, setActive];
}
