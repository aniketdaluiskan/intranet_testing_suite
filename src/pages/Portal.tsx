import { type CSSProperties } from "react";
import { useNavigate } from "../router";
import { useChurnTick, useStore } from "../store";
import { APPS, GROUPS, capacityOf } from "../apps/registry";
import { pii } from "../lib/pii";
import { appRole } from "../lib/controls";
import { multiPort, appPortOrigin } from "../lib/ports";
import { endpointFor } from "../lib/hosts";
import { getSessionId } from "../session";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function compact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(n);
}

export default function Portal() {
  const navigate = useNavigate();
  const tick = useChurnTick();
  const { settings, setSettings } = useStore();
  const idxOf = new Map(APPS.map((a, i) => [a.id, i] as const));

  const totals = APPS.reduce(
    (acc, a) => {
      const c = capacityOf(a);
      return { valid: acc.valid + c.valid, invalid: acc.invalid + c.invalid };
    },
    { valid: 0, invalid: 0 },
  );

  return (
    <div className="portal">
      <header className="portal-hdr">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Acme Intranet</h1>
            <p className="portal-sub">
              {APPS.length} applications · ≈{compact(totals.valid + totals.invalid)} fields per full pass
            </p>
          </div>
        </div>
        <div className="portal-user">
          <input
            className="portal-search"
            placeholder="Search apps"
            aria-label="Search apps"
          />
          <span className="user-chip">{pii("name", tick + 99)}</span>
        </div>
      </header>

      <section className="portal-controls" data-ap-control="1">
        <div className="pc-row">
          <label className="pc-tag">
            Session tag
            <input
              value={settings.sessionTag}
              onChange={(e) => setSettings({ sessionTag: e.target.value })}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              checked={settings.showPII}
              onChange={(e) => setSettings({ showPII: e.target.checked })}
            />
            <span className="toggle-track" aria-hidden="true">
              <span className="toggle-knob" />
            </span>
            <span className="toggle-label">Show PII values</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              checked={settings.churnMs > 0}
              onChange={(e) => setSettings({ churnMs: e.target.checked ? settings.rotateSecs * 1000 : 0 })}
            />
            <span className="toggle-track" aria-hidden="true">
              <span className="toggle-knob" />
            </span>
            <span className="toggle-label">Auto-rotate labels while idle</span>
          </label>
          <label className="pc-secs" title="Auto-rotate interval (seconds)">
            <input
              type="number"
              min={1}
              max={3600}
              step={1}
              value={settings.rotateSecs}
              onChange={(e) => {
                const s = Math.max(1, Math.min(3600, Math.round(Number(e.target.value) || 1)));
                setSettings({ rotateSecs: s, churnMs: settings.churnMs > 0 ? s * 1000 : 0 });
              }}
              aria-label="Auto-rotate interval in seconds"
            />
            <span className="pc-secs-u">s</span>
          </label>
        </div>
        <div className="pc-meta">
          <span className="toggle-note">Auto-rotate should not be used while running automation</span>
          <span className="hint">
            Labels, PII &amp; URLs also change on every click. Session:{" "}
            <code>{settings.sessionTag || getSessionId()}</code>
          </span>
        </div>
      </section>

      {GROUPS.map((g) => {
        const groupApps = APPS.filter((a) => a.group === g.id);
        if (groupApps.length === 0) return null;
        return (
          <section className="app-group" key={g.id}>
            <h2 className="group-hdr">
              {g.label} <span className="group-count">{groupApps.length}</span>
            </h2>
            <div className="app-grid">
              {groupApps.map((app) => {
                const idx = idxOf.get(app.id) ?? 0;
                const c = capacityOf(app);
                const port = 5174 + idx;
                const ep = endpointFor(app.id, idx);
                return (
                  <div className="tile-wrap" key={app.id}>
                    <button
                      className="app-tile"
                      data-app={app.id}
                      onClick={() => {
                        if (multiPort()) window.location.href = appPortOrigin(idx);
                        else navigate(`/${app.id}`);
                      }}
                      style={{ "--accent": app.accent } as CSSProperties}
                    >
                      <div className="tile-top">
                        <span className="tile-mono" style={{ background: app.accent }}>
                          {app.monogram}
                        </span>
                        <span className="tile-name">{app.name}</span>
                        <span className={`role-badge role-${appRole(app.id)}`}>
                          {appRole(app.id) === "nonprocess" ? "non-process" : appRole(app.id)}
                        </span>
                      </div>
                      <p className="tile-blurb">{app.blurb}</p>
                      <div className="tile-endpoint" title={`${ep.ip}:${ep.port}`}>
                        <span className="svc-dot" /> {ep.host}
                        <span className="svc-ip">
                          {ep.ip}:{ep.port}
                        </span>
                      </div>
                      <div className="tile-caps">
                        <span className="cap-total">{fmt(c.total)} fields</span>
                        <span className="cap-split">
                          {fmt(c.valid)} valid · {fmt(c.invalid)} invalid
                        </span>
                      </div>
                    </button>
                    {multiPort() && (
                      <a
                        className="tile-port"
                        href={`http://${window.location.hostname}:${port}/`}
                        title={`Open ${app.name} on its own port`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        :{port}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <footer className="portal-foot">
        Fake enterprise intranet · QA capture target · no real data, synthetic
        values only
      </footer>
    </div>
  );
}
