/**
 * Session identity written into <meta name="qa-capture-session"> on every page so
 * downstream DB grep can attribute captured rows to a specific QA run.
 */
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let sessionId = uuid();

export function getSessionId(): string {
  return sessionId;
}

export function applySessionMeta(value: string): void {
  sessionId = value || sessionId;
  let el = document.querySelector<HTMLMetaElement>('meta[name="qa-capture-session"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "qa-capture-session");
    document.head.appendChild(el);
  }
  el.setAttribute("content", sessionId);
}
