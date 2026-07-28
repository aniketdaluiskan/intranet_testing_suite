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
// No fixed element/time cap (a low ceiling fought slow cadences and capped coverage). An app runs
// to FULL exhaustion, and we only move on when it STALLS or is clearly LOOPING:
//   INACTIVITY_MS — move on if no action happens for 5 minutes (a genuine hang);
//   MAX_NAVS      — move on after this many NAVIGATIONS in one app. Churn-heavy, navigation-heavy
//                   apps (e.g. Outlook) mint a fresh rec-id URL on every click, so a re-mount loop
//                   navigates endlessly without repeating a URL — counting navigations catches that
//                   (a real app converges in far fewer); and
//   MAX_ACTIONS   — a high hard backstop on total actions per app that catches ANY runaway loop,
//                   including same-URL churn where the URL never even changes.
// These sit ABOVE any legitimate single view, so real work is never cut — they only trip on loops.
// Measured densest views: jira / asana ~1679 clickable+field elements each; every other app <= ~760.
// A full single-page sweep plus its dialogs can reach the low thousands, so MAX_ACTIONS is kept well
// clear of that. Converging apps make only a handful of navigations (a real loop racks up hundreds).
// DEV BOUNDARY: keep any single view's interactive+leaf+field count under ~4000 (current max 1679).
const INACTIVITY_MS = 5 * 60_000;
const MAX_NAVS = 300;
const MAX_ACTIONS = 4000;

// ── Coverage sampling (runtime-adjustable via apSetCoverage; UI = Autopilot.tsx's Min/Half/Full/
// Custom control). Two independent dimensions, so a quick smoke run can touch a slice of the estate
// instead of every element of every app:
//   actionsPct (X) — each discovered action is PERFORMED with probability X% (uniform per-action
//                    sampling), yielding ~X% of an app's total actions. A skipped element is still
//                    marked data-swept by nextUnswept, so the re-scan never revisits it (no loops),
//                    and a skip is INSTANT (no cadence delay) — so lower coverage also runs faster.
//   appsPct    (Y) — a random Y% subset of the discovered apps is traversed.
// Presets: min = 20/20, half = 50/50 (DEFAULT), full = 100/100. Custom = user-supplied X/Y (1..100).
export type ApCoverage = "min" | "half" | "full" | "custom";
let coverageMode: ApCoverage = "half";
let actionsPct = 50; // X — % of total actions per app
let appsPct = 50; // Y — % of all apps (randomly selected)
/** True if this action should be performed under the current actions-% coverage. 100% ⇒ always. */
const shouldAct = () => actionsPct >= 100 || Math.random() * 100 < actionsPct;
/** Random Y% subset of the discovered apps (kept in registry order for a tidy traversal). */
function sampleApps(all: string[]): string[] {
  if (appsPct >= 100 || all.length <= 1) return all;
  const k = Math.max(1, Math.round((all.length * appsPct) / 100));
  if (k >= all.length) return all;
  const idx = all.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx
    .slice(0, k)
    .sort((a, b) => a - b)
    .map((i) => all[i]);
}

// Mirrors the sweep's exclusions: never touch the autopilot bar or the portal's
// meta-controls; the Home button and tile side-links are driven deliberately, not
// in the generic sweep (Home is clicked LAST, tiles are the "enter app" trigger).
const EXCLUDE = ".home-dot, [data-ap-control], .tile-port";
const HOME_SELECTOR = ".home-dot";

let state: ApState = "idle";
let status = "";
let progress = 0; // 0–100
let stopFlag = false;
type ApSnap = {
  state: ApState;
  status: string;
  progress: number;
  rate: number;
  coverage: { mode: ApCoverage; actionsPct: number; appsPct: number };
};
let snap: ApSnap = {
  state,
  status,
  progress,
  rate: actionsPerSec,
  coverage: { mode: coverageMode, actionsPct, appsPct },
};
const listeners = new Set<() => void>();

function emit() {
  snap = {
    state,
    status,
    progress,
    rate: actionsPerSec,
    coverage: { mode: coverageMode, actionsPct, appsPct },
  };
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
// Paired with WORDS so a text field gets a realistic two-word entry (e.g. "Regional Vendor") rather
// than an artificial unique-suffix token — a typed field value has no functional need to be unique.
const NOUNS = [
  "Invoice", "Vendor", "Account", "Review", "Report", "Request", "Record", "Summary", "Ledger", "Statement",
];
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
      return `${WORDS[rnd(WORDS.length)]} ${NOUNS[rnd(NOUNS.length)]}`;
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
  const inputs = deepQueryAll<HTMLInputElement | HTMLTextAreaElement>(
    root,
    'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], ' +
      'input[type="search"], input[type="date"], input:not([type]), textarea',
  );
  for (const el of inputs) {
    if (stop()) return;
    await gate();
    if (!visible(el) || el.closest(EXCLUDE) || el.hasAttribute("data-swept")) continue;
    el.setAttribute("data-swept", "1");
    if (!shouldAct()) continue; // coverage: skip (already marked swept) to hit ~X% of actions
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
  for (const sel of deepQueryAll<HTMLSelectElement>(root, "select")) {
    if (stop()) return;
    await gate();
    if (!visible(sel) || sel.closest(EXCLUDE) || sel.hasAttribute("data-swept")) continue;
    sel.setAttribute("data-swept", "1");
    if (!shouldAct()) continue; // coverage gate
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
  for (const cb of deepQueryAll<HTMLInputElement>(root, 'input[type="checkbox"]')) {
    if (stop()) return;
    await gate();
    if (!visible(cb) || cb.closest(EXCLUDE) || cb.hasAttribute("data-swept")) continue;
    cb.setAttribute("data-swept", "1");
    if (!shouldAct()) continue; // coverage gate
    try {
      if (!cb.checked) cb.click();
    } catch {
      /* ignore */
    }
    onAction();
    await tick();
  }
  const groups: Record<string, HTMLInputElement[]> = {};
  deepQueryAll<HTMLInputElement>(root, 'input[type="radio"]').forEach((r) => {
    if (r.name && visible(r) && !r.closest(EXCLUDE)) (groups[r.name] ||= []).push(r);
  });
  for (const grp of Object.values(groups)) {
    if (stop()) return;
    await gate();
    grp.forEach((r) => r.setAttribute("data-swept", "1"));
    if (!shouldAct()) continue; // coverage gate
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

/** Walk the COMPOSED tree: light DOM + open shadow roots + same-origin iframes (recursively). This
 * is what lets the sweep reach content the top document's querySelectorAll can't see — e.g. Capture
 * Lab's nested same-origin iframes. Cross-origin iframes and closed shadow roots stay unreachable. */
function* deepEls(root: ParentNode): Generator<HTMLElement> {
  for (const e of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    yield e;
    if (e.shadowRoot) yield* deepEls(e.shadowRoot);
    if (e.tagName === "IFRAME") {
      try {
        const d = (e as HTMLIFrameElement).contentDocument;
        if (d && d.body) yield* deepEls(d.body);
      } catch {
        /* cross-origin iframe — unreachable, skip */
      }
    }
  }
}
/** Deep querySelectorAll across that same composed tree (light + shadow + same-origin iframes). */
function deepQueryAll<T extends HTMLElement>(root: ParentNode, selector: string): T[] {
  const out: T[] = [];
  for (const e of deepEls(root)) if (e.matches(selector)) out.push(e as T);
  return out;
}

/** Next un-swept leaf + interactive element within ``root`` (mirrors the Python
 * _MARK_NEXT_UNSWEPT_JS). ``extra`` is an extra exclusion selector — used to hold a dialog's
 * close/confirm controls back until the rest of the dialog has been interacted with. */
function nextUnswept(root: ParentNode, extra: string, nonInteractiveOnly = false): HTMLElement | null {
  for (const e of deepEls(root)) {
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
  let navCount = 0;
  let prevUrl = location.pathname + location.search;
  const onAction = () => {
    lastAction = Date.now();
    actions++;
    setProgress(((appIdx + Math.min(0.95, actions / 500)) / total) * 100);
  };
  // Count a navigation whenever the URL changes (path OR query). Churn mints a fresh rec-id URL on
  // each click in navigation-heavy apps, so a re-mount loop navigates endlessly -> navCount climbs.
  const trackNav = () => {
    const u = location.pathname + location.search;
    if (u !== prevUrl) {
      navCount++;
      prevUrl = u;
    }
  };
  // No fixed element cap -- an app exhausts naturally. Bail only on a genuine STALL, or a clear LOOP:
  // too many navigations (MAX_NAVS), or a high total-action backstop (MAX_ACTIONS) for same-URL churn.
  const stop = () =>
    Date.now() - lastAction > INACTIVITY_MS || navCount > MAX_NAVS || actions > MAX_ACTIONS;

  // MODAL-FIRST: ANY interaction can open a dialog -- even a phase-1 leaf click that bubbles up to a
  // card/button. Whenever one is open we interact ONLY inside it (type its fields, set its controls,
  // click its body), then CLOSE it, THEN resume the page. serviceModal() does one such step and
  // returns true while a dialog is open; every page phase calls it FIRST so the background is never
  // touched while a dialog is up.
  let dialogFilled = false;
  const serviceModal = async (): Promise<boolean> => {
    const modal = openModal();
    if (!modal) return false;
    if (!dialogFilled) {
      setStatus(`${appId} · dialog`);
      await typeTextboxes(modal, onAction, stop);
      await setControls(modal, onAction, stop);
      dialogFilled = true;
    }
    const el = nextUnswept(modal, CLOSE_EXCLUDE); // dialog body; close/confirm held back until last
    if (el) {
      if (shouldAct()) {
        await clickEl(el);
        onAction();
        await tick();
      }
      return true; // el is already marked swept; a skip still advances the dialog toward close
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
    return true;
  };

  // Phase 1 — click every non-interactive leaf (labels, text, cells, icons); modal-first.
  setStatus(`${appId} · text & labels`);
  while (!stop()) {
    await gate();
    if (await serviceModal()) continue; // a leaf click may have opened a dialog -> handle it first
    const el = nextUnswept(document.body, "", true);
    if (!el) break;
    if (!shouldAct()) continue; // coverage: el already marked swept; skip to hit ~X% of actions
    await clickEl(el);
    onAction();
    trackNav();
    await tick();
  }
  // Close out any dialog still open before the field phases (which aren't per-field modal-scoped).
  while (!stop() && (await serviceModal())) {
    /* drain lingering dialog */
  }
  // Phase 2 — click + type each textbox, one by one.
  setStatus(`${appId} · typing fields`);
  await typeTextboxes(document, onAction, stop);
  // Phase 3 — set the other interactables (selects, checkboxes, radios).
  setStatus(`${appId} · controls`);
  await setControls(document, onAction, stop);

  // Phase 4 — sweep whatever is still pending (buttons, links, tabs, churn-revealed); modal-first.
  setStatus(`${appId} · sweep`);
  while (!stop()) {
    await gate();
    if (await serviceModal()) continue;
    const el = nextUnswept(document.body, "");
    if (!el) break;
    if (!shouldAct()) continue; // coverage: el already marked swept; skip to hit ~X% of actions
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

    const apps = sampleApps(discoverApps()); // coverage: traverse a random Y% subset (Y<100)
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
/** Set coverage. Presets: min=20/20, half=50/50, full=100/100. custom uses x (actions %) and y
 * (apps %), each clamped 1..100. Takes effect on the NEXT run (app subset is chosen at run start;
 * the per-action gate applies immediately, including mid-run). */
export function apSetCoverage(mode: ApCoverage, x?: number, y?: number): void {
  coverageMode = mode;
  const clamp = (n: number) => Math.max(1, Math.min(100, Math.round(n)));
  if (mode === "min") {
    actionsPct = 20;
    appsPct = 20;
  } else if (mode === "half") {
    actionsPct = 50;
    appsPct = 50;
  } else if (mode === "full") {
    actionsPct = 100;
    appsPct = 100;
  } else {
    if (typeof x === "number" && isFinite(x)) actionsPct = clamp(x);
    if (typeof y === "number" && isFinite(y)) appsPct = clamp(y);
  }
  emit();
}
export function apGetCoverage(): { mode: ApCoverage; actionsPct: number; appsPct: number } {
  return { mode: coverageMode, actionsPct, appsPct };
}
