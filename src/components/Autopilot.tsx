import { useSyncExternalStore } from "react";
import { apSubscribe, apSnapshot, apPlay, apPause, apStop } from "../autopilot";

/** Top-left play / pause / stop control for the in-page autopilot. */
export default function Autopilot() {
  const s = useSyncExternalStore(apSubscribe, apSnapshot, apSnapshot);
  return (
    <div className="autopilot-bar" data-ap-control="1">
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
