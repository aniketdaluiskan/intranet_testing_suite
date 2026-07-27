import { navigate } from "./router";
import { APPS } from "./apps/registry";
import { closePanel } from "./apps/panel";

/**
 * In-page autopilot. FLOW mirrors the e2e sweep
 * (tests/ui_validations/test_click_all_elements_local_app.py): discover every app
 * from the registry (∪ any [data-app] tiles), then for each app — open it, fill
 * every visible field, click EVERY leaf + interactive element (marking + re-scan so
 * churn-revealed elements are covered), and click the Home button LAST — then move
 * to the next app. MECHANISM mirrors SDA_v3's fill engine: per-field typed values
 * dispatched with real input/change/click events at a fixed 3-interactions/sec cadence, plus a
 * live progress %. Events are in-page synthetic (isTrusted=false); the trusted
 * variant is driver/autopilot_driver.py.
 *
 * Works in single-origin mode (hosted / `npm run dev`). Under multi-port
 * serve-ports.mjs each app is a separate origin, so use the Playwright driver there.
 */

export type ApState = "idle" | "running" | "paused";

// Action cadence: DEFAULT 5 click/enter actions per second (one every ~200 ms). Runtime-adjustable
// via apSetRate(1..20). stepMs() is the gap between discrete actions (field commit, select,
// checkbox/radio, element click). Typing within a field is separate — CHAR_MS between characters.
// NOTE (best-effort at the extremes): browsers clamp setTimeout to ~4 ms, and on churn-heavy pages
// every interaction triggers a re-render that adds latency, so 20/sec is a ceiling, NOT a guarantee
// (sustaining it would need a config/perf update, e.g. lighter re-renders). 1/sec is the floor.
const RATE_MIN = 1;
const RATE_MAX = 20;
let actionsPerSec = 5; // default; change at runtime via apSetRate()
const stepMs = () => Math.round(1000 / actionsPerSec);
const CHAR_MS = 1; // per-character typing delay (best-effort; UA timer clamp ~4 ms applies)
// No fixed per-app cap (a click/time ceiling fought slow cadences and capped coverage). Instead an
// app runs to FULL exhaustion, and we only move on when it STALLS or clearly LOOPS:
//   INACTIVITY_MS  — move on if no action happens for 5 minutes (a genuine hang), and
//   MAX_REVISITS   — move on if this many navigations in a row land back on already-seen views
//                    (a list<->item churn cycle that re-mounts and would otherwise never converge).
const INACTIVITY_MS = 5 * 60_000;
const MAX_REVISITS = 20;

// Mirrors the sweep's exclusions: never touch the autopilot bar or the portal's
// meta-controls; the Home button and tile side-links are driven deliberately, not
// in the generic sweep (Home is clicked LAST, tiles are the "enter app" trigger).
const EXCLUDE = ".home-dot, [data-ap-control], .tile-port";
const HOME_SELECTOR = ".home-dot";

let state: ApState = "idle";
let status = "";
let progress = 0; // 0–100
let stopFlag = false;
let snap: { state: ApState; status: string; progress: number; rate: number } = { state, status, progress, rate: actionsPerSec };
const listeners = new Set<() => void>();

function emit() {
  snap = { state, status, progress, rate: actionsPerSec };
  listeners.forEach((l) => l());
}
export function apSubscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function apSnapshot() {
  return snap;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function gate() {
  while (state === "paused" && !stopFlag) await sleep(120);
  if (stopFlag) throw new Error("stopped");
}
async function tick(ms?: number) {
  await gate();
  await sleep(ms ?? stepMs());
  await gate();
}
function setStatus(s: string) {
  status = s;
  emit();
}
function setProgress(p: number) {
  progress = Math.max(0, Math.min(100, Math.round(p)));
  emit();
}

function visible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === "function") return el.checkVisibility();
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1 && el.offsetParent !== null;
}

/** Registry-driven (auto picks up new apps) ∪ any [data-app] tiles in the DOM. */
function discoverApps(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of APPS)
    if (!seen.has(a.id)) {
      seen.add(a.id);
      out.push(a.id);
    }
  document.querySelectorAll("[data-app]").forEach((el) => {
    const id = el.getAttribute("data-app");
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  });
  return out;
}

/* ── SDA-style typed value per input kind ── */
const WORDS = [
  "Verified", "Confirmed", "Active", "Pending", "Approved", "Standard", "Primary", "Regional", "Quarterly", "Corporate",
];
let seedCtr = 1;
const rnd = (n: number) => Math.floor(Math.random() * n);
function valueForInput(el: HTMLInputElement | HTMLTextAreaElement): string {
  const type =
    el.tagName.toLowerCase() === "textarea" ? "textarea" : (el.getAttribute("type") || "text").toLowerCase();
  const dg = () => String(rnd(10));
  switch (type) {
    case "email":
      return `user${rnd(9000) + 1000}@acme.example`;
    case "tel":
      return `+1-${dg()}${dg()}${dg()}-${dg()}${dg()}${dg()}-${dg()}${dg()}${dg()}${dg()}`;
    case "number":
      return String(rnd(90000) + 100);
    case "date":
      return `${2020 + rnd(6)}-${String(1 + rnd(12)).padStart(2, "0")}-${String(1 + rnd(28)).padStart(2, "0")}`;
    default:
      return `${WORDS[rnd(WORDS.length)]}-${(seedCtr++).toString(36)}`;
  }
}

/** Full pointer→mouse→click sequence at the element centre (in-page synthetic). */
function realClick(el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  const o: PointerEventInit & MouseEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: r.left + r.width / 2,
    clientY: r.top + r.height / 2,
    button: 0,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
  };
  el.dispatchEvent(new PointerEvent("pointerover", o));
  el.dispatchEvent(new PointerEvent("pointerdown", o));
  el.dispatchEvent(new MouseEvent("mousedown", o));
  try {
    el.focus();
  } catch {
    /* ignore */
  }
  el.dispatchEvent(new PointerEvent("pointerup", o));
  el.dispatchEvent(new MouseEvent("mouseup", o));
  el.dispatchEvent(new MouseEvent("click", o));
}

/* ── Phase 2: click + type each textbox, one by one (char-by-char, CHAR_MS between chars) ── */
async function typeTextboxes(root: ParentNode, onAction: () => void, stop: () => boolean): Promise<void> {
  const inputs = Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], ' +
        'input[type="search"], input[type="date"], input:not([type]), textarea',
    ),
  );
  for (const el of inputs) {
    if (stop()) return;
    await gate();
    if (!visible(el) || el.closest(EXCLUDE) || el.hasAttribute("data-swept")) continue;
    el.setAttribute("data-swept", "1");
    try {
      await clickEl(el); // Phase 2 clicks the textbox first, THEN types into it
      el.focus();
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      const val = valueForInput(el);
      for (let ci = 0; ci < val.length; ci++) {
        await gate();
        const ch = val[ci];
        el.value += ch;
        el.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent("keyup", { key: ch, bubbles: true }));
        await sleep(CHAR_MS); // ~1 ms between characters (UA-clamped to ~4 ms — best-effort)
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {
      /* ignore */
    }
    onAction();
    await tick(); // action-cadence gap before the next field
  }
}

/* ── Phase 3: set the other interactables — selects, checkboxes, radios ── */
async function setControls(root: ParentNode, onAction: () => void, stop: () => boolean): Promise<void> {
  for (const sel of Array.from(root.querySelectorAll<HTMLSelectElement>("select"))) {
    if (stop()) return;
    await gate();
    if (!visible(sel) || sel.closest(EXCLUDE) || sel.hasAttribute("data-swept")) continue;
    sel.setAttribute("data-swept", "1");
    try {
      if (sel.options.length > 1) {
        realClick(sel);
        sel.selectedIndex = 1 + rnd(sel.options.length - 1);
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch {
      /* ignore */
    }
    onAction();
    await tick();
  }
  for (const cb of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))) {
    if (stop()) return;
    await gate();
    if (!visible(cb) || cb.closest(EXCLUDE) || cb.hasAttribute("data-swept")) continue;
    cb.setAttribute("data-swept", "1");
    try {
      if (!cb.checked) cb.click();
    } catch {
      /* ignore */
    }
    onAction();
    await tick();
  }
  const groups: Record<string, HTMLInputElement[]> = {};
  root.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((r) => {
    if (r.name && visible(r) && !r.closest(EXCLUDE)) (groups[r.name] ||= []).push(r);
  });
  for (const grp of Object.values(groups)) {
    if (stop()) return;
    await gate();
    grp.forEach((r) => r.setAttribute("data-swept", "1"));
    try {
      grp[rnd(grp.length)].click();
    } catch {
      /* ignore */
    }
    onAction();
    await tick();
  }
}

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "LINK", "META", "HEAD", "TITLE", "NOSCRIPT", "BR", "HR", "HTML", "BODY", "IFRAME", "SELECT", "TEXTAREA",
]);
const SKIP_INPUT = new Set(["checkbox", "radio", "text", "email", "tel", "number", "search", "date", "password", ""]);

function interactive(e: HTMLElement): boolean {
  const t = e.tagName.toLowerCase();
  if (t === "button" || t === "a" || t === "input" || t === "select" || t === "textarea") return true;
  return e.hasAttribute("role") || e.hasAttribute("tabindex") || e.getAttribute("draggable") === "true" || e.isContentEditable;
}

/** Next un-swept leaf + interactive element within ``root`` (mirrors the Python
 * _MARK_NEXT_UNSWEPT_JS). ``extra`` is an extra exclusion selector — used to hold a dialog's
 * close/confirm controls back until the rest of the dialog has been interacted with. */
function nextUnswept(root: ParentNode, extra: string, nonInteractiveOnly = false): HTMLElement | null {
  for (const e of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (e.hasAttribute("data-swept")) continue;
    if (SKIP_TAGS.has(e.tagName)) continue;
    if (e.closest(EXCLUDE)) continue;
    if (extra && e.closest(extra)) continue;
    if (e.tagName === "INPUT" && SKIP_INPUT.has((e.getAttribute("type") || "").toLowerCase())) continue;
    if (e.children.length > 0 && !interactive(e)) continue; // skip pure wrapper containers
    if (nonInteractiveOnly && interactive(e)) continue; // Phase 1: non-interactive leaves only
    if (!visible(e)) continue;
    e.setAttribute("data-swept", "1");
    return e;
  }
  return null;
}

// An open dialog/popup (our ActionPanel, or any aria-modal dialog). While one is open the sweep
// works ONLY inside it; its close/confirm controls are held back until everything else is done.
const CLOSE_EXCLUDE = ".modal-x, .modal-foot .tbtn, .modal-foot button";
function openModal(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".modal-scrim .modal") ||
    document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')
  );
}
async function clickEl(el: HTMLElement): Promise<void> {
  try {
    el.scrollIntoView({ block: "center", inline: "center" });
    el.classList.add("ap-focus");
    realClick(el);
    el.classList.remove("ap-focus");
  } catch {
    /* ignore */
  }
}

async function sweepApp(appId: string, appIdx: number, total: number): Promise<void> {
  let lastAction = Date.now();
  let actions = 0;
  const seen = new Set<string>([location.pathname]);
  let prevPath = location.pathname;
  let revisit = 0;
  const onAction = () => {
    lastAction = Date.now();
    actions++;
    setProgress(((appIdx + Math.min(0.95, actions / 500)) / total) * 100);
  };
  // Track navigations: a new view resets the loop counter; landing back on an already-seen view
  // bumps it. Only a run of MAX_REVISITS seen-view returns (with no new view in between) = a loop.
  const trackNav = () => {
    const p = location.pathname;
    if (p !== prevPath) {
      if (seen.has(p)) revisit++;
      else {
        seen.add(p);
        revisit = 0;
      }
      prevPath = p;
    }
  };
  // No fixed cap — stop this app only when it STALLS (no action for 5 min) or clearly LOOPS.
  const stop = () => Date.now() - lastAction > INACTIVITY_MS || revisit > MAX_REVISITS;

  // Phase 1 — click every non-interactive leaf (labels, text, cells, icons).
  setStatus(`${appId} · text & labels`);
  while (!stop()) {
    await gate();
    const el = nextUnswept(document.body, "", true);
    if (!el) break;
    await clickEl(el);
    onAction();
    trackNav();
    await tick();
  }
  // Phase 2 — click + type each textbox, one by one.
  setStatus(`${appId} · typing fields`);
  await typeTextboxes(document, onAction, stop);
  // Phase 3 — set the other interactables (selects, checkboxes, radios).
  setStatus(`${appId} · controls`);
  await setControls(document, onAction, stop);

  // Phase 4 — sweep whatever is still pending (buttons, links, tabs, churn-revealed), modal-aware.
  setStatus(`${appId} · sweep`);
  let dialogFilled = false;
  while (!stop()) {
    await gate();
    const modal = openModal();
    if (modal) {
      // A dialog is open — interact ONLY inside it (same 4-phase spirit: type its fields, set its
      // controls, click its body), holding its close/confirm controls back until last.
      if (!dialogFilled) {
        setStatus(`${appId} · dialog`);
        await typeTextboxes(modal, onAction, stop);
        await setControls(modal, onAction, stop);
        dialogFilled = true;
      }
      const el = nextUnswept(modal, CLOSE_EXCLUDE);
      if (el) {
        await clickEl(el);
        onAction();
        await tick();
        continue;
      }
      // Dialog exhausted -> close it, THEN resume the page.
      setStatus(`${appId} · closing dialog`);
      const closer =
        modal.querySelector<HTMLElement>(".modal-foot .tbtn.primary") ||
        modal.querySelector<HTMLElement>(".modal-foot .tbtn") ||
        document.querySelector<HTMLElement>(".modal-x");
      if (closer) {
        closer.setAttribute("data-swept", "1");
        await clickEl(closer);
      }
      await tick(200);
      if (openModal()) closePanel();
      dialogFilled = false;
      onAction();
      await tick();
      continue;
    }
    const el = nextUnswept(document.body, "");
    if (!el) break;
    await clickEl(el);
    onAction();
    trackNav();
    await tick();
  }
}

async function run(): Promise<void> {
  try {
    setProgress(0);
    setStatus("Opening portal");
    navigate("/");
    await tick(500);

    const apps = discoverApps();
    if (apps.length === 0) {
      await sweepApp("page", 0, 1);
      setProgress(100);
    } else {
      for (let i = 0; i < apps.length; i++) {
        await gate();
        const id = apps[i];
        setStatus(`Opening ${id}`);
        navigate("/"); // ensure we're on the portal
        await tick(300);
        const tile = document.querySelector<HTMLElement>(`[data-app="${id}"]`);
        if (tile) realClick(tile); // enter via the launcher tile (mirrors the sweep)
        else navigate("/" + id);
        await tick(500);

        await sweepApp(id, i, apps.length);

        // Home LAST — only after the app's elements are exhausted.
        await gate();
        setStatus(`${id} · returning home`);
        const home = document.querySelector<HTMLElement>(HOME_SELECTOR);
        if (home) realClick(home);
        else navigate("/");
        await tick(400);
        setProgress(((i + 1) / apps.length) * 100);
      }
      setProgress(100);
    }
    setStatus("Complete");
    await sleep(600);
  } catch {
    /* stopped */
  }
  state = "idle";
  stopFlag = false;
  status = "";
  emit();
}

/** Play: start if idle, resume if paused. */
export function apPlay(): void {
  if (state === "paused") {
    state = "running";
    emit();
    return;
  }
  if (state === "running") return;
  state = "running";
  stopFlag = false;
  progress = 0;
  emit();
  void run();
}
export function apPause(): void {
  if (state === "running") {
    state = "paused";
    emit();
  }
}
export function apStop(): void {
  stopFlag = true;
  state = "idle";
  status = "";
  progress = 0;
  emit();
}
/** Set the action cadence (click/enter actions per second). Clamped to 1..20; default 5. Takes
 * effect immediately, including mid-run. High values are best-effort (see the cadence note above). */
export function apSetRate(n: number): void {
  actionsPerSec = Math.max(RATE_MIN, Math.min(RATE_MAX, Math.round(n)));
  emit();
}
export function apGetRate(): number {
  return actionsPerSec;
}
