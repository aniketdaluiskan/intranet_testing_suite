import { useEffect, useState } from "react";
import { useStore } from "../store";

/**
 * Top-right countdown to the next auto-rotate refresh. Visible ONLY while "Auto-rotate labels while
 * idle" is on (settings.churnMs > 0). Counts down from churnMs to 0; when the store fires a rotation
 * it updates tickAt, which snaps the ring back to full for the next cycle. Rendered globally (App),
 * so it follows you across the portal and every app.
 */
export default function RefreshTimer() {
  const { settings, tickAt } = useStore();
  const [, force] = useState(0);

  useEffect(() => {
    if (settings.churnMs <= 0) return;
    const id = setInterval(() => force((n) => (n + 1) & 0xffff), 100); // redraw ~10x/sec
    return () => clearInterval(id);
  }, [settings.churnMs]);

  if (settings.churnMs <= 0) return null;

  const total = settings.churnMs;
  const remaining = Math.max(0, tickAt + total - Date.now());
  const pct = total > 0 ? remaining / total : 0;
  const R = 13;
  const C = 2 * Math.PI * R;

  return (
    <div
      className="refresh-timer"
      data-ap-control="1"
      title="Auto-rotate is on — labels, PII & URLs refresh when this reaches 0, then it resets"
    >
      <svg className="rt-ring" width="32" height="32" viewBox="0 0 32 32">
        <circle className="rt-bg" cx="16" cy="16" r={R} />
        <circle
          className="rt-fg"
          cx="16"
          cy="16"
          r={R}
          style={{ strokeDasharray: C, strokeDashoffset: C * (1 - pct) }}
        />
      </svg>
      <div className="rt-text">
        <span className="rt-num">{(remaining / 1000).toFixed(1)}s</span>
        <span className="rt-lbl">to refresh</span>
      </div>
    </div>
  );
}
