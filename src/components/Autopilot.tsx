import { useSyncExternalStore } from "react";
import { apSubscribe, apSnapshot, apPlay, apPause, apStop, apSetRate } from "../autopilot";

/** Top-left play / pause / stop control for the in-page autopilot. */
export default function Autopilot() {
  const s = useSyncExternalStore(apSubscribe, apSnapshot, apSnapshot);
  return (
    <div className="autopilot-bar" data-ap-control="1">
      <label
        className="ap-speed"
        title={
          "Actions per second (1–20, default 5). High values are best-effort: browsers clamp timers " +
          "to ~4 ms and churn-heavy pages re-render on each action, so 20/sec is a ceiling, not a " +
          "guarantee — sustaining it needs a perf/config update."
        }
      >
        <span className="ap-speed-x">⚡</span>
        <input
          type="number"
          min={1}
          max={20}
          step={1}
          value={s.rate}
          onChange={(e) => apSetRate(Number(e.target.value))}
        />
        <span className="ap-speed-u">/s</span>
      </label>
      {s.state !== "idle" && (
        <span className="ap-progress" title="Sweep progress">
          {s.progress}%
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
      {s.state !== "idle" && (
        <button className="ap-btn stop" title="Stop" onClick={apStop}>
          ⏹
        </button>
      )}
      {s.status && <span className="ap-status">{s.status}</span>}
    </div>
  );
}
