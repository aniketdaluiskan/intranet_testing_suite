import { useEffect, useState, useSyncExternalStore } from "react";
import {
  apSubscribe,
  apSnapshot,
  apPlay,
  apPause,
  apStop,
  apSetRate,
  apSetMaxClicks,
  apSetCoverage,
  type ApCoverage,
} from "../autopilot";
import { useStore } from "../store";

// Coverage presets. The tooltip text is the exact spec: what each mode does to actions-per-app and
// apps-traversed. "Custom" lets the user set X (actions %) and Y (apps %) directly.
const COVERAGE_MODES: { id: ApCoverage; label: string; tip: string }[] = [
  { id: "min", label: "Min", tip: "20% of total actions per app on 20% of all apps (randomly selected)" },
  { id: "half", label: "Half", tip: "50% of total actions per app on 50% of all apps (randomly selected)" },
  { id: "full", label: "Full", tip: "100% of total actions per app on 100% of all apps" },
  { id: "custom", label: "Custom", tip: "X% of total actions per app on Y% of all apps (randomly selected)" },
];

/** Floating autopilot control: a small pill (settings toggle · state chip · play/pause/stop) that
 * expands into a settings panel for speed (actions/sec) and coverage (Min / Half / Full / Custom). */
export default function Autopilot() {
  const s = useSyncExternalStore(apSubscribe, apSnapshot, apSnapshot);
  const { settings, setSettings } = useStore();
  const [open, setOpen] = useState(false);
  const cov = s.coverage;
  // When the autopilot is active, force "Auto-rotate labels while idle" OFF: the idle re-roll
  // remounts churn-keyed views and wipes the sweep's `data-swept` marks, breaking convergence
  // (see store.tsx). Re-applies if it's toggled back on mid-run.
  useEffect(() => {
    if (s.state !== "idle" && settings.churnMs > 0) setSettings({ churnMs: 0 });
  }, [s.state, settings.churnMs, setSettings]);
  const running = s.state !== "idle";
  const covLabel =
    cov.mode === "custom" ? `${cov.actionsPct}/${cov.appsPct}` : cov.mode.charAt(0).toUpperCase() + cov.mode.slice(1);
  const covHint =
    cov.mode === "full"
      ? "Every action on every app."
      : `~${cov.actionsPct}% of actions on a random ${cov.appsPct}% of apps.`;

  return (
    <div className="autopilot" data-ap-control="1">
      {open && (
        <div className="ap-panel" role="group" aria-label="Autopilot settings">
          <div className="ap-panel-hd">
            <span>Autopilot</span>
            <button className="ap-x" title="Close" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="ap-field">
            <span className="ap-field-l" title="Actions per second (1–20, default 5). High values are best-effort.">
              Speed
            </span>
            <span className="ap-num">
              <input
                type="number"
                min={1}
                max={20}
                step={1}
                value={s.rate}
                onChange={(e) => apSetRate(Number(e.target.value))}
              />
              <em>/s</em>
            </span>
          </div>

          <div className="ap-field">
            <span
              className="ap-field-l"
              title="Stop the whole run after this many clicks (0 = no limit). Counts every action, including entering an app and returning Home."
            >
              Max clicks
            </span>
            <span className="ap-num">
              <input
                type="number"
                min={0}
                step={1}
                value={s.maxClicks}
                onChange={(e) => apSetMaxClicks(Number(e.target.value))}
              />
              <em>{running && s.maxClicks > 0 ? `${s.clicks}/${s.maxClicks}` : s.maxClicks > 0 ? "cap" : "off"}</em>
            </span>
          </div>

          <div className="ap-field">
            <span className="ap-field-l">Coverage</span>
            <div className="ap-seg">
              {COVERAGE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={cov.mode === m.id ? "on" : ""}
                  title={m.tip}
                  aria-pressed={cov.mode === m.id}
                  onClick={() => apSetCoverage(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {cov.mode === "custom" && (
            <div className="ap-field ap-field-custom">
              <span className="ap-num" title="X — % of total actions performed per app (1–100)">
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={cov.actionsPct}
                  onChange={(e) => apSetCoverage("custom", Number(e.target.value), cov.appsPct)}
                />
                <em>% act</em>
              </span>
              <span className="ap-num" title="Y — % of all apps traversed, randomly selected (1–100)">
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={cov.appsPct}
                  onChange={(e) => apSetCoverage("custom", cov.actionsPct, Number(e.target.value))}
                />
                <em>% apps</em>
              </span>
            </div>
          )}

          <p className="ap-hint">{covHint}</p>
          {running && s.status && <div className="ap-status-line">{s.status}</div>}
        </div>
      )}

      <div className="ap-bar">
        <button
          className={"ap-gear" + (open ? " on" : "")}
          title="Autopilot settings"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          ⚙
        </button>
        {running ? (
          <span
            className="ap-progress"
            title={(s.status || "Sweep progress") + (s.maxClicks > 0 ? ` · ${s.clicks}/${s.maxClicks} clicks` : "")}
          >
            {s.progress}%
          </span>
        ) : (
          <span className="ap-chip" title={"Coverage: " + covHint} onClick={() => setOpen(true)}>
            {covLabel}
          </span>
        )}
        {s.state === "running" ? (
          <button className="ap-btn" title="Pause" onClick={apPause}>
            ⏸
          </button>
        ) : (
          <button className="ap-btn play" title={s.state === "paused" ? "Resume" : "Play"} onClick={apPlay}>
            ▶
          </button>
        )}
        {running && (
          <button className="ap-btn stop" title="Stop" onClick={apStop}>
            ⏹
          </button>
        )}
      </div>
    </div>
  );
}
