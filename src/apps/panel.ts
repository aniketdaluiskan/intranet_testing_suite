import { useSyncExternalStore } from "react";

/**
 * Global "open record / action" panel. Action buttons (New, Create, Approve,
 * open-a-row, …) open a modal that renders an editable label→value form — so a
 * click visibly opens something AND surfaces more capturable attributes. View
 * switches (sidebar/tabs) do NOT open it; only item/action opens do.
 */
let title: string | null = null;
let snap: { title: string | null } = { title: null };
const listeners = new Set<() => void>();

function emit() {
  snap = { title };
  listeners.forEach((l) => l());
}

export function openPanel(t: string): void {
  title = t || "Details";
  emit();
}
export function closePanel(): void {
  title = null;
  emit();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return snap;
}
export function usePanel(): { title: string | null } {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
