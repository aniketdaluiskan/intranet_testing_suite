import { navigate } from "./router";
import { APPS } from "./apps/registry";
import { VERBS } from "./lib/words";

/**
 * In-page autopilot (synthetic events). Play → click every interactive element
 * on the current page one by one, then for each sub-app: open it, click all its
 * elements (re-collecting after churn navigations), edit text fields (delete a
 * few chars + type a few), go back to the portal, next app. 400ms per action.
 * Pause/resume/stop.
 *
 * NOTE: these are synthetic DOM events (isTrusted=false). For real hardware /
 * trusted events that record as real user input, use driver/autopilot_driver.py.
 */

export type ApState = "idle" | "running" | "paused";

const INTERVAL = 400;
const PER_APP = 40; // max clicks per app before moving on (bounds run time)

const SELECTOR =
  'button, a[href], input, select, textarea, [role="menuitem"], [role="tab"], ' +
  ".app-tile, .nav-i, .rtab, .mf, .stab, .thumb, .board-card, .chip, .row-open, .commit";

let state: ApState = "idle";
let status = "";
let stopFlag = false;
let snap: { state: ApState; status: string } = { state, status };
const listeners = new Set<() => void>();

function emit() {
  snap = { state, status };
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
async function tick() {
  await gate();
  await sleep(INTERVAL);
  await gate();
}

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1 && el.offsetParent !== null;
}

function collect(excludeTiles: boolean): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
    if (el.closest("[data-ap-control]")) return false; // never touch the autopilot bar
    if (el.classList.contains("home-dot")) return false; // don't leave the app early
    if (excludeTiles && el.classList.contains("app-tile")) return false;
    if (el.hasAttribute("data-ap-done")) return false;
    return isVisible(el);
  });
}

function word(n: number): string {
  return VERBS[n % VERBS.length];
}

/** Full pointer→mouse→click sequence at the element's center — the most
 * realistic click a page script can produce (still isTrusted=false, but fires
 * pointerdown/mousedown/focus/pointerup/mouseup/click like a real interaction). */
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
  el.dispatchEvent(new PointerEvent("pointerenter", o));
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

async function act(el: HTMLElement, i: number): Promise<void> {
  el.setAttribute("data-ap-done", "1");
  el.scrollIntoView({ block: "center", inline: "center" });
  el.classList.add("ap-focus");
  const tag = el.tagName.toLowerCase();
  const type = (el.getAttribute("type") || "").toLowerCase();

  if (tag === "textarea" || (tag === "input" && ["", "text", "email", "search"].includes(type))) {
    const inp = el as HTMLInputElement;
    inp.focus();
    // delete a few characters
    inp.value = (inp.value || "").slice(0, Math.max(0, (inp.value || "").length - 3));
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(INTERVAL / 2);
    // type a few characters
    for (const ch of " " + word(i)) {
      inp.value += ch;
      inp.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true }));
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent("keyup", { key: ch, bubbles: true }));
    }
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (tag === "input" && (type === "checkbox" || type === "radio")) {
    el.click();
  } else if (tag === "select") {
    const sel = el as HTMLSelectElement;
    if (sel.options.length > 1) {
      sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else {
    realClick(el); // buttons/links/tiles/tabs/nav — realistic sequence, may navigate + churn
  }
  el.classList.remove("ap-focus");
}

async function clickThrough(excludeTiles: boolean, budget: number): Promise<void> {
  let clicks = 0;
  while (clicks < budget) {
    await gate();
    const targets = collect(excludeTiles);
    if (targets.length === 0) break;
    await act(targets[0], clicks);
    clicks++;
    await tick();
  }
}

async function run(): Promise<void> {
  try {
    navigate("/");
    await sleep(600);
    // 1) click the portal's own controls (not the tiles)
    status = "Portal";
    emit();
    await clickThrough(true, 12);

    // 2) each sub-app: open tile → click everything → back
    for (const app of APPS) {
      await gate();
      status = `Opening ${app.name}`;
      emit();
      navigate("/");
      await sleep(400);
      const tile = document.querySelector<HTMLElement>(`[data-app="${app.id}"]`);
      if (tile) await act(tile, 0);
      else navigate(`/${app.id}`);
      await tick();
      status = app.name;
      emit();
      await clickThrough(false, PER_APP);
      navigate("/"); // back to main
      await tick();
    }
  } catch {
    /* stopped */
  }
  state = "idle";
  status = "";
  stopFlag = false;
  emit();
}

/** Play button: start if idle, resume if paused. */
export function apPlay(): void {
  if (state === "paused") {
    state = "running";
    emit();
    return;
  }
  if (state === "running") return;
  state = "running";
  stopFlag = false;
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
  emit();
}
