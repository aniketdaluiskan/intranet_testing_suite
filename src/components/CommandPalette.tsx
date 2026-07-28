import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { APPS } from "../apps/registry";
import { useNavigate } from "../router";
import { multiPort, appPortOrigin } from "../lib/ports";

/**
 * ⌘K / Ctrl+K command palette — a keyboard-driven app launcher. Opens on the shortcut only (never
 * via a click), renders nothing when closed, and carries data-ap-control, so the element sweep
 * never sees or opens it. Arrow keys move, Enter launches (multi-port aware), Esc closes.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
        setSel(0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? APPS.filter((a) => a.name.toLowerCase().includes(t) || a.blurb.toLowerCase().includes(t))
      : APPS;
    return list.slice(0, 8);
  }, [q]);

  if (!open) return null;

  const go = (idx: number) => {
    const app = results[idx];
    if (!app) return;
    setOpen(false);
    const i = APPS.findIndex((a) => a.id === app.id);
    if (multiPort()) window.location.href = appPortOrigin(i);
    else navigate("/" + app.id);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(sel);
    }
  };

  return (
    <div className="cmdk-scrim" data-ap-control="1" onClick={() => setOpen(false)}>
      <div className="cmdk" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Search apps…   ⌘K"
          aria-label="Search apps"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul className="cmdk-list">
          {results.length === 0 && <li className="cmdk-empty">No apps match “{q}”</li>}
          {results.map((a, i) => (
            <li
              key={a.id}
              className={"cmdk-item" + (i === sel ? " on" : "")}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(i)}
            >
              <span className="cmdk-mono" style={{ background: a.accent }}>
                {a.monogram}
              </span>
              <span className="cmdk-name">{a.name}</span>
              <span className="cmdk-blurb">{a.blurb}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
